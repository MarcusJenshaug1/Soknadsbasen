import "server-only";
import { prisma } from "@/lib/prisma";

// NAV pam-stilling-feed (event-sourced, JWT-authenticated).
// Docs: https://navikt.github.io/pam-stilling-feed/
// Base: https://pam-stilling-feed.nav.no
//
// Migrert fra deprecated arbeidsplassen.nav.no/public-feed/api/v1/ads
// (deaktivert 1. mai 2025).

export const FEED_BASE = "https://pam-stilling-feed.nav.no";
const PUBLIC_TOKEN_URL = `${FEED_BASE}/api/publicToken`;
export const FEED_ROOT = "/api/v1/feed";

const TOKEN_REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000; // fornye når <24t igjen

// ─── Feed-page typer ────────────────────────────────────────

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  content_text?: string;
  date_modified: string;
  _feed_entry: {
    uuid: string;
    status: "ACTIVE" | "INACTIVE" | string;
    title: string;
    businessName?: string;
    municipal?: string;
    sistEndret: string;
  };
};

export type FeedPage = {
  version: string;
  title?: string;
  feed_url: string;
  next_url: string | null;
  id: string;
  next_id: string | null;
  items: FeedItem[];
};

// ─── Detail-entry typer (rik data, kun for ACTIVE) ──────────

export type FeedEntryLocation = {
  address?: string | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
  postalCode?: string | null;
  municipal?: string | null;
};

export type FeedEntryContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
};

export type FeedEntryEmployer = {
  name?: string;
  publicName?: string | null;
  orgnr?: string | null;
  description?: string | null;
  homepage?: string | null;
};

export type FeedEntryCategory = {
  code?: string;
  categoryType?: string;
  name?: string;
};

export type FeedEntryDetail = {
  uuid: string;
  status: string;
  sistEndret: string;
  // Når status=ACTIVE er disse fylt; når INACTIVE er payload minimal
  title?: string;
  description?: string;
  published?: string;
  expires?: string | null;
  updated?: string;
  applicationDue?: string | null;
  applicationUrl?: string | null;
  sourceurl?: string | null;
  sourceUrl?: string | null;
  jobtitle?: string;
  engagementtype?: string | null;
  extent?: string | null;
  positioncount?: number | null;
  sector?: string | null;
  workhours?: string | null;
  workday?: string | null;
  starttime?: string | null;
  remote?: string | null;
  workLanguage?: string[] | null;
  employer?: FeedEntryEmployer;
  workLocations?: FeedEntryLocation[];
  occupationCategories?: FeedEntryCategory[];
  categoryList?: FeedEntryCategory[];
  contactList?: FeedEntryContact[];
};

// ─── Token-håndtering ───────────────────────────────────────

export async function getNavToken(): Promise<string> {
  const cached = await prisma.navFeedToken.findUnique({ where: { id: "singleton" } });
  if (cached && cached.expiresAt.getTime() - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return cached.token;
  }

  const res = await fetch(PUBLIC_TOKEN_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`publicToken ${res.status}`);
  const text = await res.text();
  // Response: "Current public token for ...\n<JWT>" eller bare "<JWT>"
  const match = text.match(/eyJ[A-Za-z0-9._-]+/);
  if (!match) throw new Error("Klarte ikke parse JWT fra publicToken-respons");
  const token = match[0];

  // Decode exp uten signaturverifisering
  const parts = token.split(".");
  let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (parts.length >= 2) {
    try {
      const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
        exp?: number;
      };
      if (payload.exp) expiresAt = new Date(payload.exp * 1000);
    } catch {
      // behold default
    }
  }

  await prisma.navFeedToken.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", token, expiresAt },
    update: { token, expiresAt, fetchedAt: new Date() },
  });

  return token;
}

export async function invalidateNavToken(): Promise<void> {
  await prisma.navFeedToken
    .delete({ where: { id: "singleton" } })
    .catch(() => undefined);
}

// ─── HTTP-hjelpere ──────────────────────────────────────────

export type PageFetchResult =
  | { status: 304; body: null; etag: string | null; lastModified: string | null }
  | { status: 200; body: FeedPage; etag: string | null; lastModified: string | null };

export async function fetchFeedPage(
  feedPath: string,
  token: string,
  conditional: { etag?: string | null; lastModified?: string | null } = {},
): Promise<PageFetchResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "Soknadsbasen/1.0 (+https://soknadsbasen.no)",
  };
  if (conditional.etag) headers["If-None-Match"] = conditional.etag;
  if (conditional.lastModified) headers["If-Modified-Since"] = conditional.lastModified;

  const res = await fetch(`${FEED_BASE}${feedPath}`, { headers, cache: "no-store" });

  if (res.status === 304) {
    return {
      status: 304,
      body: null,
      etag: conditional.etag ?? null,
      lastModified: conditional.lastModified ?? null,
    };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Feed ${feedPath} -> ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as FeedPage;
  return {
    status: 200,
    body,
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
  };
}

/**
 * NAV pam-stilling-feed returnerer FeedEntryContent: { uuid, sistEndret, status, ad_content }
 * der ad_content er FeedAd (full annonse) eller null for event-stubs.
 * Vi flater ut ad_content til toppnivå så pick*-helperne kan lese feltene direkte.
 * Returnerer null når ad_content mangler — caller skal hoppe over upsert.
 */
type FeedEntryContent = {
  uuid: string;
  sistEndret: string;
  status: string;
  ad_content: Omit<FeedEntryDetail, "uuid" | "sistEndret" | "status"> | null;
};

export async function fetchFeedEntry(
  itemUrl: string,
  token: string,
): Promise<FeedEntryDetail | null> {
  const res = await fetch(`${FEED_BASE}${itemUrl}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Soknadsbasen/1.0 (+https://soknadsbasen.no)",
    },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`feedentry ${itemUrl} -> ${res.status}`);
  }
  const wrapper = (await res.json()) as FeedEntryContent;
  if (!wrapper.ad_content) return null;
  return {
    uuid: wrapper.uuid,
    sistEndret: wrapper.sistEndret,
    status: wrapper.status,
    ...wrapper.ad_content,
  };
}

// ─── Mapping-hjelpere ───────────────────────────────────────

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

export function pickEmployerName(detail: FeedEntryDetail, fallback: string): string {
  return (
    detail.employer?.publicName?.trim() ||
    detail.employer?.name?.trim() ||
    fallback ||
    "Ukjent arbeidsgiver"
  );
}

export function pickLocation(detail: FeedEntryDetail, fallbackMunicipal?: string): {
  location: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
} {
  const loc = detail.workLocations?.[0];
  if (!loc) {
    return {
      location: fallbackMunicipal ?? null,
      region: fallbackMunicipal ?? null,
      postalCode: null,
      country: null,
    };
  }
  const city = (loc.city ?? loc.municipal ?? null)?.trim() ?? null;
  const county = loc.county?.trim() ?? null;
  return {
    location: city ?? county ?? fallbackMunicipal ?? null,
    region: county ?? city ?? null,
    postalCode: loc.postalCode?.trim() ?? null,
    country: loc.country?.trim() ?? null,
  };
}

export type SerializedLocation = {
  address: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  postalCode: string | null;
  municipal: string | null;
};

export function serializeLocations(detail: FeedEntryDetail): SerializedLocation[] {
  const list = detail.workLocations ?? [];
  return list
    .map((loc) => ({
      address: loc.address?.trim() ?? null,
      city: loc.city?.trim() ?? null,
      county: loc.county?.trim() ?? null,
      country: loc.country?.trim() ?? null,
      postalCode: loc.postalCode?.trim() ?? null,
      municipal: loc.municipal?.trim() ?? null,
    }))
    .filter(
      (l) => l.address || l.city || l.county || l.country || l.postalCode || l.municipal,
    );
}

export function pickPrimaryContact(detail: FeedEntryDetail): {
  name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
} {
  const c = detail.contactList?.[0];
  return {
    name: c?.name?.trim() || null,
    email: c?.email?.trim() || null,
    phone: c?.phone?.trim() || null,
    title: c?.title?.trim() || null,
  };
}

export function pickPrimaryAddress(detail: FeedEntryDetail): string | null {
  return detail.workLocations?.[0]?.address?.trim() || null;
}

export function pickCategory(detail: FeedEntryDetail): {
  category: string | null;
  occupation: string | null;
} {
  const cat =
    detail.categoryList?.[0]?.name ?? detail.occupationCategories?.[0]?.name ?? null;
  const occ = detail.occupationCategories?.[0]?.name ?? detail.jobtitle ?? null;
  return { category: cat, occupation: occ };
}

export type SerializedCategory = {
  code: string | null;
  categoryType: string | null;
  name: string | null;
};

export function serializeCategories(
  list: FeedEntryCategory[] | undefined,
): SerializedCategory[] {
  return (list ?? [])
    .map((c) => ({
      code: c.code?.trim() ?? null,
      categoryType: c.categoryType?.trim() ?? null,
      name: c.name?.trim() ?? null,
    }))
    .filter((c) => c.name || c.code);
}

/**
 * Sanitiserer HTML-formattert annonse-tekst fra NAV. Beholder strukturelle
 * elementer (h2-h4, p, ul/ol/li, strong/em, br, a) og stripper alt annet.
 * NAV leverer rik HTML med fete overskrifter og bullet-lister, vi vil bevare
 * det for visning, men ikke stole blindt på markup-en.
 */
const ALLOWED_TAGS = new Set([
  "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "b", "i", "br", "a",
]);
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:)/i;

export function cleanDescription(html: string): string {
  if (!html) return "";

  let out = html
    .replace(/\r\n/g, "\n")
    // fjern script/style/iframe og deres innhold
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    // fjern HTML-kommentarer
    .replace(/<!--[\s\S]*?-->/g, "");

  // Filtrer tag-for-tag: behold whitelisted, fjern resten
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tagRaw, attrs) => {
    const tag = String(tagRaw).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const isClosing = match.startsWith("</");
    if (isClosing) return `</${tag}>`;
    if (tag === "a") {
      const hrefMatch = String(attrs).match(/href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i);
      const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? "";
      if (!SAFE_HREF.test(href)) return "<span>";
      return `<a href="${escapeAttr(href)}" rel="nofollow noopener" target="_blank">`;
    }
    return `<${tag}>`;
  });

  // Erstatt span-fallback (fra a-tag uten safe href) tilbake til ren tekst
  out = out.replace(/<span>([\s\S]*?)<\/span>/g, "$1");

  // Komprimer whitespace inne i tekst, men bevar HTML-struktur
  out = out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return out;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isDetailActive(detail: FeedEntryDetail, now: Date = new Date()): boolean {
  if (detail.status && detail.status.toUpperCase() !== "ACTIVE") return false;
  const exp = detail.expires ?? detail.applicationDue;
  if (!exp) return true;
  return new Date(exp) > now;
}
