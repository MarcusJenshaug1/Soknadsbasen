import "server-only";
import { prisma } from "@/lib/prisma";
import {
  fetchNavAds,
  slugify,
  pickLocation,
  pickCategory,
  isAdActive,
  cleanDescription,
  type NavAd,
} from "./nav-feed";

export type SyncResult = {
  fetched: number;
  inserted: number;
  updated: number;
  deactivated: number;
  errors: string[];
};

/** Sync N pages from the NAV feed. Default: 5 pages × 100 ads = 500 latest. */
export async function syncNavJobs(
  opts: { pages?: number; pageSize?: number } = {},
): Promise<SyncResult> {
  const pages = opts.pages ?? 5;
  const size = opts.pageSize ?? 100;

  const result: SyncResult = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    deactivated: 0,
    errors: [],
  };

  const seenIds = new Set<string>();

  for (let page = 0; page < pages; page++) {
    let response;
    try {
      response = await fetchNavAds({ page, size });
    } catch (err) {
      result.errors.push(
        `Page ${page}: ${err instanceof Error ? err.message : String(err)}`,
      );
      break;
    }

    if (!response.content || response.content.length === 0) break;

    for (const ad of response.content) {
      result.fetched += 1;
      seenIds.add(ad.uuid);

      try {
        const upserted = await upsertAd(ad);
        if (upserted === "created") result.inserted += 1;
        else if (upserted === "updated") result.updated += 1;
      } catch (err) {
        result.errors.push(
          `Ad ${ad.uuid}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (response.totalPages !== undefined && page + 1 >= response.totalPages) break;
  }

  // Deactivate ads no longer in the feed AND past their expiry
  const now = new Date();
  const stale = await prisma.job.updateMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: { lt: now } },
        { source: "arbeidsplassen", externalId: { notIn: Array.from(seenIds) }, publishedAt: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
      ],
    },
    data: { isActive: false },
  });
  result.deactivated = stale.count;

  return result;
}

async function upsertAd(ad: NavAd): Promise<"created" | "updated" | "skipped"> {
  if (!ad.uuid || !ad.title || !ad.description) return "skipped";

  const employerName =
    ad.employer?.publicName?.trim() ||
    ad.employer?.name?.trim() ||
    "Ukjent arbeidsgiver";

  const titleSlug = slugify(ad.title);
  const employerSlug = slugify(employerName);
  const slug = `${titleSlug}-${employerSlug}-${ad.uuid.slice(0, 8)}`.slice(0, 100);

  const { location, region } = pickLocation(ad);
  const { category, occupation } = pickCategory(ad);

  const description = cleanDescription(ad.description);
  const publishedAt = ad.published ? new Date(ad.published) : new Date();
  const expiresAt = ad.expires ?? ad.applicationDue;
  const expires = expiresAt ? new Date(expiresAt) : null;
  const isActive = isAdActive(ad);

  const existing = await prisma.job.findUnique({
    where: { externalId: ad.uuid },
    select: { id: true },
  });

  await prisma.job.upsert({
    where: { externalId: ad.uuid },
    create: {
      externalId: ad.uuid,
      source: ad.source ?? "arbeidsplassen",
      title: ad.title.slice(0, 250),
      slug,
      employerName: employerName.slice(0, 200),
      employerSlug,
      description: description.slice(0, 50_000),
      location,
      region,
      category,
      occupation,
      employmentType: ad.engagementtype ?? ad.extent ?? null,
      applyUrl: ad.applicationUrl ?? ad.sourceUrl ?? null,
      publishedAt,
      expiresAt: expires,
      isActive,
    },
    update: {
      title: ad.title.slice(0, 250),
      description: description.slice(0, 50_000),
      location,
      region,
      category,
      occupation,
      employmentType: ad.engagementtype ?? ad.extent ?? null,
      applyUrl: ad.applicationUrl ?? ad.sourceUrl ?? null,
      expiresAt: expires,
      isActive,
    },
  });

  return existing ? "updated" : "created";
}
