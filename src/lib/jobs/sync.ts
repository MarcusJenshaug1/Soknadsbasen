import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  FEED_ROOT,
  cleanDescription,
  fetchFeedEntry,
  fetchFeedPage,
  getNavToken,
  invalidateNavToken,
  isDetailActive,
  pickCategory,
  pickEmployerName,
  pickLocation,
  pickPrimaryAddress,
  pickPrimaryContact,
  serializeCategories,
  serializeLocations,
  slugify,
  type FeedEntryDetail,
  type FeedItem,
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

    // Fast-forward: hopp over hele siden hvis Last-Modified-header er eldre
    // enn cutoff. Header reflekterer sidens overordnede tid, mens enkelt-items
    // kan ha bumpet date_modified pga. status-events.
    const cutoff = Date.now() - FAST_FORWARD_DAYS * 86400_000;
    const pageTime = lastModified ? new Date(lastModified).getTime() : NaN;
    const skipPage = !Number.isNaN(pageTime) && pageTime < cutoff;

    if (skipPage) {
      // Sida er for gammel, advance cursor uten prosessering
    } else if (items.length > 0) {
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

  // ACTIVE: detail-fetch + upsert i parallell (slice for slice)
  // 4s timeout per detail-call så hengende requests ikke blokkerer
  for (let i = 0; i < active.length; i += DETAIL_CONCURRENCY) {
    if (deadline && Date.now() > deadline) break;
    const slice = active.slice(i, i + DETAIL_CONCURRENCY);
    const sliceResults = await Promise.all(
      slice.map(async (item) => {
        try {
          const detail = await Promise.race([
            fetchFeedEntry(item.url, token),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error("detail timeout 4s")), 4000),
            ),
          ]);
          if (!detail) return { action: "skipped" as const, error: null };
          const action = await upsertJob(item, detail);
          return { action, error: null };
        } catch (err) {
          return {
            action: "error" as const,
            error: `${item._feed_entry.uuid}: ${errMsg(err)}`,
          };
        }
      }),
    );

    for (const r of sliceResults) {
      if (r.action === "created") out.inserted += 1;
      else if (r.action === "updated") out.updated += 1;
      if (r.error) out.errors.push(r.error);
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

  const { location, region, postalCode, country } = pickLocation(
    detail,
    item._feed_entry.municipal,
  );
  const { category, occupation } = pickCategory(detail);

  const workLocations = serializeLocations(detail);
  const categoryList = serializeCategories(detail.categoryList);
  const occupationList = serializeCategories(detail.occupationCategories);

  const description = cleanDescription(detail.description ?? "");
  const publishedAt = detail.published
    ? new Date(detail.published)
    : new Date(item._feed_entry.sistEndret);
  const expiresRaw = detail.expires ?? detail.applicationDue;
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
  const applicationDueAt = detail.applicationDue ? new Date(detail.applicationDue) : null;
  const sourceUpdatedAt = detail.updated ? new Date(detail.updated) : null;
  const isActive = isDetailActive(detail);

  const engagementType = detail.engagementtype?.trim() || null;
  const extent = detail.extent?.trim() || null;
  const employmentType = engagementType ?? extent;
  const sourceUrl = detail.sourceurl ?? detail.sourceUrl ?? null;
  const applyUrl = detail.applicationUrl ?? sourceUrl ?? null;

  const employerOrgnr = detail.employer?.orgnr?.trim() || null;
  const employerHomepage = detail.employer?.homepage?.trim() || null;
  const employerDescriptionRaw = detail.employer?.description ?? null;
  const employerDescription = employerDescriptionRaw
    ? cleanDescription(employerDescriptionRaw).slice(0, 10_000)
    : null;

  const positionCount =
    typeof detail.positioncount === "number" && Number.isFinite(detail.positioncount)
      ? detail.positioncount
      : null;
  const sector = detail.sector?.trim() || null;

  const jobTitle = detail.jobtitle?.trim() || null;
  const workhours = detail.workhours?.trim() || null;
  const workdays = detail.workday?.trim() || null;
  const starttime = detail.starttime?.trim() || null;
  const remote = detail.remote?.trim() || null;
  const address = pickPrimaryAddress(detail);
  const workLanguages = Array.isArray(detail.workLanguage)
    ? detail.workLanguage.map((s) => s.trim()).filter(Boolean)
    : [];
  const contact = pickPrimaryContact(detail);

  // Drop findUnique-precheck: én roundtrip i stedet for to. Returner "updated"
  // som default (kan ikke skille created/updated uten precheck), men det er
  // bare metrics, ingen funksjonell forskjell.
  await prisma.job.upsert({
    where: { externalId: item._feed_entry.uuid },
    create: {
      externalId: item._feed_entry.uuid,
      source: "arbeidsplassen",
      title: title.slice(0, 250),
      slug,
      employerName: employerName.slice(0, 200),
      employerSlug,
      employerOrgnr,
      employerDescription,
      employerHomepage,
      description: description.slice(0, 50_000),
      location,
      region,
      postalCode,
      country,
      workLocations: workLocations.length > 0 ? (workLocations as Prisma.InputJsonValue) : Prisma.DbNull,
      category,
      occupation,
      categoryList: categoryList.length > 0 ? (categoryList as Prisma.InputJsonValue) : Prisma.DbNull,
      occupationList: occupationList.length > 0 ? (occupationList as Prisma.InputJsonValue) : Prisma.DbNull,
      employmentType,
      engagementType,
      extent,
      positionCount,
      sector,
      jobTitle,
      workhours,
      workdays,
      starttime,
      address,
      remote,
      workLanguages,
      contactName: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      contactTitle: contact.title,
      applyUrl,
      sourceUrl,
      applicationDueAt,
      publishedAt,
      expiresAt,
      sourceUpdatedAt,
      isActive,
    },
    update: {
      title: title.slice(0, 250),
      employerName: employerName.slice(0, 200),
      employerOrgnr,
      employerDescription,
      employerHomepage,
      description: description.slice(0, 50_000),
      location,
      region,
      postalCode,
      country,
      workLocations: workLocations.length > 0 ? (workLocations as Prisma.InputJsonValue) : Prisma.DbNull,
      category,
      occupation,
      categoryList: categoryList.length > 0 ? (categoryList as Prisma.InputJsonValue) : Prisma.DbNull,
      occupationList: occupationList.length > 0 ? (occupationList as Prisma.InputJsonValue) : Prisma.DbNull,
      employmentType,
      engagementType,
      extent,
      positionCount,
      sector,
      jobTitle,
      workhours,
      workdays,
      starttime,
      address,
      remote,
      workLanguages,
      contactName: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      contactTitle: contact.title,
      applyUrl,
      sourceUrl,
      applicationDueAt,
      expiresAt,
      sourceUpdatedAt,
      isActive,
    },
  });

  return "updated";
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
