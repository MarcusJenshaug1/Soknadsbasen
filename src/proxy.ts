import { NextResponse, type NextRequest } from "next/server";

const APP_PATH_PREFIX = "/app";

/**
 * Edge cookie-sniff. Redirecter ikke-innloggede /app/**-treff til /logg-inn uten
 * å treffe Supabase eller Prisma. DB-validering av sesjonen ligger i layoutet
 * (Prisma er ikke edge-kompatibel uten egen adapter, og auth.getUser() er et
 * HTTP-kall vi vil unngå på edge for hver request).
 *
 * Når cookien finnes lar vi requesten passere; layoutet validerer og redirecter
 * hvis tokenen er utløpt eller mangler bruker-rad.
 */
/**
 * Legacy /jobb-params (?region=&sort=) → nytt skjema med ekte 308.
 * Kan ikke ligge i page: loading.tsx flusher shellen før permanentRedirect
 * kaster, så page-redirect blir 200 + klient-hopp — ubrukelig for SEO på
 * allerede indekserte URL-er. Kategori-translasjon (trenger DB-register)
 * håndteres fortsatt soft i page — kun region/sort var i indekserte URL-er.
 */
const LEGACY_REGION_TO_FYLKE: Record<string, string> = {
  oslo: "oslo",
  akershus: "akershus",
  "østfold": "ostfold",
  buskerud: "buskerud",
  innlandet: "innlandet",
  vestfold: "vestfold",
  telemark: "telemark",
  agder: "agder",
  rogaland: "rogaland",
  vestland: "vestland",
  "møre og romsdal": "more-og-romsdal",
  "trøndelag": "trondelag",
  nordland: "nordland",
  troms: "troms",
  finnmark: "finnmark",
};

function legacyJobbRedirect(request: NextRequest): NextResponse | null {
  const url = request.nextUrl;
  if (url.pathname !== "/jobb") return null;
  const region = url.searchParams.get("region");
  const sort = url.searchParams.get("sort");
  if (region === null && sort === null) return null;

  const next = url.clone();
  next.searchParams.delete("region");
  next.searchParams.delete("sort");
  if (region) {
    const fylke = LEGACY_REGION_TO_FYLKE[region.trim().toLowerCase()];
    if (fylke) next.searchParams.set("fylke", fylke);
  }
  if (sort === "match") next.searchParams.set("sortering", "match");
  return NextResponse.redirect(next, 308);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacy = legacyJobbRedirect(request);
  if (legacy) return legacy;

  if (!pathname.startsWith(APP_PATH_PREFIX)) {
    return NextResponse.next();
  }

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (hasAuthCookie) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/logg-inn";
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app/:path*", "/jobb"],
};
