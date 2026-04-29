import "server-only";
import { prisma } from "@/lib/prisma";
import {
  FEED_ROOT,
  fetchFeedEntry,
  fetchFeedPage,
  getNavToken,
  invalidateNavToken,
  isDetailActive,
  pickCategory,
  pickEmployerName,
  pickLocation,
  cleanDescription,
  slugify,
  type FeedItem,
  type FeedEntryDetail,
} from "./nav-feed";

export type SyncResult = {
  pagesProcessed: number;
  itemsSeen: number;
  inserted: number;
  updated: number;
  deactivated: number;
  notModified: boolean;
  reachedTail: boolean;
  durationMs: number;
  errors: string[];
};

// Hvor langt tilbake går vi første gang (cursor mangler).
// 200 dager dekker NAVs maks aktive periode (~6 mnd) med margin.
const INITIAL_LOOKBACK_DAYS = 200;

// Default tidsbudsjett. Caller kan overstyre. Holdes godt under Vercel
// maxDuration (300 s) slik at responsen rekker tilbake til pg_net.
const DEFAULT_BUDGET_MS = 50_000;

// Maks parallelle detail-kall per side
const DETAIL_CONCURRENCY = 6;

// Fast-forward: hvis hele siden er eldre enn dette, hopp over item-prosessering
// og advance kun cursor. Reduserer initial backfill fra timer til minutter.
const FAST_FORWARD_DAYS = 60;

/**
 * Walker pam-stilling-feed via cursor. Resumable og idempotent.
 * Stopper ved tail (next_url=null) eller når budsjett er brukt.
 */
export async function syncNavJobs(
  opts: { budgetMs?: number } = {},
): Promise<SyncResult> {
  const start = Date.now();
  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;

  const result: SyncResult = {
    pagesProcessed: 0,
    itemsSeen: 0,
    inserted: 0,
    updated: 0,
    deactivated: 0,
    notModified: false,
    reachedTail: false,
    durationMs: 0,
    errors: [],
  };

  let token: string;
  try {
    token = await getNavToken();
  } catch (err) {
    result.errors.push(`token: ${errMsg(err)}`);
    result.durationMs = Date.now() - start;
    return result;
  }

  let cursor = await loadCursor();
  let pagePath = cursor.nextUrl ?? cursor.feedUrl;
  let conditional = pagePath === cursor.feedUrl
    ? { etag: cursor.etag, lastModified: cursor.lastModified }
    : { etag: null, lastModified: null };

  while (Date.now() - start < budget) {
    let pageResult;
    try {
      pageResult = await fetchFeedPage(pagePath, token, conditional);
    } catch (err) {
      const msg = errMsg(err);
      // 401/403 → token mistenkt utløpt, prøv én gang med ny token
      if (/-> 40[13]/.test(msg)) {
        await invalidateNavToken();
        try {
          token = await getNavToken();
          pageResult = await fetchFeedPage(pagePath, token, conditional);
        } catch (err2) {
          result.errors.push(`page ${pagePath}: ${errMsg(err2)}`);
          break;
        }
      } else {
        result.errors.push(`page ${pagePath}: ${msg}`);
        break;
      }
    }

    if (pageResult.status === 304) {
      result.notModified = true;
      result.reachedTail = true;
      break;
    }

    const { body, etag, lastModified } = pageResult;
    result.pagesProcessed += 1;

    // Behandle items: hent detalj for ACTIVE, deaktiver INACTIVE
    const items = body.items ?? [];
    result.itemsSeen += items.length;

    // Fast-forward: hopp over hele siden hvis alle items er eldre enn cutoff
    const cutoff = Date.now() - FAST_FORWARD_DAYS * 86400_000;
    const newestItem = items.reduce((max, item) => {
      const t = new Date(item.date_modified ?? item._feed_entry.sistEndret).getTime();
      return t > max ? t : max;
    }, 0);

    if (items.length > 0 && newestItem < cutoff) {
      // Hele siden er gammel, ingen value i å prosessere. Bare advance cursor.
    } else {
      const itemResults = await processItems(items, token, start + budget);
      result.inserted += itemResults.inserted;
      result.updated += itemResults.updated;
      result.deactivated += itemResults.deactivated;
      result.errors.push(...itemResults.errors);
    }

    cursor = {
      feedUrl: body.feed_url ?? pagePath,
      etag,
      lastModified,
      nextUrl: body.next_url,
      nextId: body.next_id,
    };
    await saveCursor(cursor);

    if (!body.next_url) {
      result.reachedTail = true;
      break;
    }
    pagePath = body.next_url;
    conditional = { etag: null, lastModified: null }; // unconditional for nye sider
  }

  result.durationMs = Date.now() - start;
  return result;
}

// ─── Cursor i Postgres ──────────────────────────────────────

type Cursor = {
  feedUrl: string;
  etag: string | null;
  lastModified: string | null;
  nextUrl: string | null;
  nextId: string | null;
};

async function loadCursor(): Promise<Cursor> {
  const row = await prisma.navFeedCursor.findUnique({ where: { id: "singleton" } });
  if (row) {
    return {
      feedUrl: row.feedUrl,
      etag: row.etag,
      lastModified: row.lastModified,
      nextUrl: row.nextUrl,
      nextId: row.nextId,
    };
  }
  // Initial cursor: start ved feed-roten med If-Modified-Since 200 dager tilbake
  const start = new Date(Date.now() - INITIAL_LOOKBACK_DAYS * 86400_000);
  return {
    feedUrl: FEED_ROOT,
    etag: null,
    lastModified: start.toUTCString(),
    nextUrl: null,
    nextId: null,
  };
}

async function saveCursor(c: Cursor): Promise<void> {
  await prisma.navFeedCursor.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      feedUrl: c.feedUrl,
      etag: c.etag,
      lastModified: c.lastModified,
      nextUrl: c.nextUrl,
      nextId: c.nextId,
    },
    update: {
      feedUrl: c.feedUrl,
      etag: c.etag,
      lastModified: c.lastModified,
      nextUrl: c.nextUrl,
      nextId: c.nextId,
    },
  });
}

// ─── Item-prosessering ──────────────────────────────────────

type ItemBatchResult = {
  inserted: number;
  updated: number;
  deactivated: number;
  errors: string[];
};

async function processItems(
  items: FeedItem[],
  token: string,
  deadline?: number,
): Promise<ItemBatchResult> {
  const out: ItemBatchResult = { inserted: 0, updated: 0, deactivated: 0, errors: [] };

  // Splitt på status først
  const active = items.filter((i) => i._feed_entry.status === "ACTIVE");
  const inactive = items.filter((i) => i._feed_entry.status !== "ACTIVE");

  // INACTIVE: bulk-deactivate (én updateMany for hele siden)
  if (inactive.length > 0) {
    try {
      const r = await prisma.job.updateMany({
        where: {
          externalId: { in: inactive.map((i) => i._feed_entry.uuid) },
          isActive: true,
        },
        data: { isActive: false },
      });
      out.deactivated += r.count;
    } catch (err) {
      out.errors.push(`bulk deactivate: ${errMsg(err)}`);
    }
  }

  // ACTIVE: hent detail med begrenset parallellitet, så upsert sekvensielt
  // 8s timeout per detail-call så en hengende request ikke blokkerer hele tikken
  for (let i = 0; i < active.length; i += DETAIL_CONCURRENCY) {
    if (deadline && Date.now() > deadline) break;
    const slice = active.slice(i, i + DETAIL_CONCURRENCY);
    const details = await Promise.all(
      slice.map(async (item) => {
        try {
          const detail = await Promise.race([
            fetchFeedEntry(item.url, token),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error("detail timeout 8s")), 8000),
            ),
          ]);
          return { item, detail, error: null as string | null };
        } catch (err) {
          return { item, detail: null, error: errMsg(err) };
        }
      }),
    );

    for (const { item, detail, error } of details) {
      if (error) {
        out.errors.push(`detail ${item._feed_entry.uuid}: ${error}`);
        continue;
      }
      if (!detail) continue; // 404 → sletta hos NAV
      try {
        const action = await upsertJob(item, detail);
        if (action === "created") out.inserted += 1;
        else if (action === "updated") out.updated += 1;
      } catch (err) {
        out.errors.push(`upsert ${item._feed_entry.uuid}: ${errMsg(err)}`);
      }
    }
  }

  return out;
}

async function upsertJob(
  item: FeedItem,
  detail: FeedEntryDetail,
): Promise<"created" | "updated" | "skipped"> {
  const title = (detail.title ?? item._feed_entry.title ?? "").trim();
  if (!title) return "skipped";

  const employerName = pickEmployerName(detail, item._feed_entry.businessName ?? "");
  const titleSlug = slugify(title);
  const employerSlug = slugify(employerName);
  const slug = `${titleSlug}-${employerSlug}-${item._feed_entry.uuid.slice(0, 8)}`.slice(
    0,
    100,
  );

  const { location, region } = pickLocation(detail, item._feed_entry.municipal);
  const { category, occupation } = pickCategory(detail);

  const description = cleanDescription(detail.description ?? "");
  const publishedAt = detail.published
    ? new Date(detail.published)
    : new Date(item._feed_entry.sistEndret);
  const expiresRaw = detail.expires ?? detail.applicationDue;
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
  const isActive = isDetailActive(detail);

  const existing = await prisma.job.findUnique({
    where: { externalId: item._feed_entry.uuid },
    select: { id: true },
  });

  await prisma.job.upsert({
    where: { externalId: item._feed_entry.uuid },
    create: {
      externalId: item._feed_entry.uuid,
      source: "arbeidsplassen",
      title: title.slice(0, 250),
      slug,
      employerName: employerName.slice(0, 200),
      employerSlug,
      description: description.slice(0, 50_000),
      location,
      region,
      category,
      occupation,
      employmentType: detail.engagementtype ?? detail.extent ?? null,
      applyUrl: detail.applicationUrl ?? detail.sourceurl ?? detail.sourceUrl ?? null,
      publishedAt,
      expiresAt,
      isActive,
    },
    update: {
      title: title.slice(0, 250),
      description: description.slice(0, 50_000),
      location,
      region,
      category,
      occupation,
      employmentType: detail.engagementtype ?? detail.extent ?? null,
      applyUrl: detail.applicationUrl ?? detail.sourceurl ?? detail.sourceUrl ?? null,
      expiresAt,
      isActive,
    },
  });

  return existing ? "updated" : "created";
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
