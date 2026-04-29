import "server-only";

// NAV/Arbeidsplassen public feed.
// Docs: https://arbeidsplassen.nav.no/static/api-doc/

const FEED_BASE = "https://arbeidsplassen.nav.no/public-feed/api/v1/ads";

export type NavLocation = {
  city?: string | null;
  county?: string | null;
  country?: string | null;
  postalCode?: string | null;
};

export type NavEmployer = {
  name?: string;
  publicName?: string | null;
  description?: string | null;
};

export type NavCategory = {
  code?: string;
  categoryType?: string;
  name?: string;
};

export type NavAd = {
  uuid: string;
  title: string;
  description: string;
  status?: string;
  source?: string;
  published?: string;
  expires?: string | null;
  applicationDue?: string | null;
  applicationUrl?: string | null;
  sourceUrl?: string | null;
  employer?: NavEmployer;
  locations?: NavLocation[];
  categoryList?: NavCategory[];
  occupationCategories?: NavCategory[];
  jobtitle?: string;
  workhours?: string[];
  workdays?: string[];
  positioncount?: number;
  extent?: string;
  engagementtype?: string;
};

export type NavFeedResponse = {
  content: NavAd[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
};

export type FetchOptions = {
  page?: number;
  size?: number;
  /** ISO date — only ads published after this date */
  publishedAfter?: string;
};

export async function fetchNavAds(opts: FetchOptions = {}): Promise<NavFeedResponse> {
  const params = new URLSearchParams();
  if (opts.page !== undefined) params.set("page", String(opts.page));
  if (opts.size !== undefined) params.set("size", String(opts.size));
  if (opts.publishedAfter) params.set("published", `${opts.publishedAfter},`);

  const url = `${FEED_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Soknadsbasen/1.0 (+https://soknadsbasen.no)",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`NAV feed ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as NavFeedResponse;
}

const SLUG_REPLACEMENTS: Record<string, string> = {
  æ: "ae",
  ø: "o",
  å: "a",
  Æ: "ae",
  Ø: "o",
  Å: "a",
};

export function slugify(input: string): string {
  return input
    .replace(/[æøåÆØÅ]/g, (m) => SLUG_REPLACEMENTS[m] ?? m)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function pickLocation(ad: NavAd): { location: string | null; region: string | null } {
  const loc = ad.locations?.[0];
  if (!loc) return { location: null, region: null };
  const city = loc.city?.trim() ?? null;
  const county = loc.county?.trim() ?? null;
  return { location: city ?? county, region: county ?? city };
}

export function pickCategory(ad: NavAd): { category: string | null; occupation: string | null } {
  const cat = ad.categoryList?.[0]?.name ?? ad.occupationCategories?.[0]?.name ?? null;
  const occ = ad.occupationCategories?.[0]?.name ?? ad.jobtitle ?? null;
  return { category: cat, occupation: occ };
}

export function isAdActive(ad: NavAd, now: Date = new Date()): boolean {
  if (ad.status && ad.status.toUpperCase() !== "ACTIVE") return false;
  const expires = ad.expires ?? ad.applicationDue;
  if (!expires) return true;
  return new Date(expires) > now;
}

/** Normalize the description: strip excessive whitespace, keep paragraphs. */
export function cleanDescription(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
