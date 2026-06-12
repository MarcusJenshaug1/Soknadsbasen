import "server-only";

import { prisma } from "@/lib/prisma";

import { displayPlace, formatCategory, isValidFacet } from "./format";
import { slugifyNb } from "./slug";
import { fylkeByDbValue } from "./geo";
import { withHeavyQueryGate } from "./heavy-query-gate";
import { createSingleFlightCache } from "./single-flight-cache";

/**
 * DB-deriverte registre for kommune og kategori: slug ↔ dbValue ↔ label.
 * Deriveres fra faktiske kolonneverdier (aldri statiske lister) så de ikke
 * kan sprike fra NAVs navneformer. Cachet 1 t i prosess-lokal single-flight-
 * cache (IKKE unstable_cache: den deduper ikke samtidige revalideringer, jf.
 * DB-hendelsen 2026-06-12) — vokabularet endres bare når feeden introduserer
 * nye verdier.
 */

const registerCache = createSingleFlightCache<RegisterEntry[]>(3_600_000);

export type RegisterEntry = {
  slug: string;
  /** lower(kolonneverdi) — det RPC-en grupperer på og filtre sendes som. */
  dbValue: string;
  label: string;
  /** Kun kommuner: fylkes-slug for sted-hierarkiet. */
  fylkeSlug?: string;
};

/** Kuraterte korte SEO-slugs for hyppige kategorier (ellers slugifyNb). */
const KATEGORI_OVERRIDES: Record<string, string> = {
  "it og utvikling": "it",
  "helse og sosial": "helse",
  "bygg og anlegg": "bygg-og-anlegg",
};

function dedupeSlugs(entries: RegisterEntry[]): RegisterEntry[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.slug, (counts.get(e.slug) ?? 0) + 1);
  return entries.map((e) => {
    if ((counts.get(e.slug) ?? 0) <= 1 || !e.fylkeSlug) return e;
    // Tvetydige kommunenavn (Våler, Herøy, …) får fylkes-suffiks.
    return { ...e, slug: `${e.slug}-${e.fylkeSlug}` };
  });
}

export function getKommuneRegister(): Promise<RegisterEntry[]> {
  return registerCache("kommune", () => withHeavyQueryGate(async () => {
    // Per-element-par fra workLocations: (kommune, fylke) fra SAMME lokasjon —
    // dekker alle arbeidssteder, ikke bare primærkolonnen. lowercase matcher
    // kommuner[]-arrayen som filtre/RPC bruker.
    const rows = await prisma.$queryRaw<{ kommune: string; region: string | null }[]>`
      SELECT DISTINCT
        lower(trim(COALESCE(nullif(trim(el->>'municipal'), ''), el->>'city'))) AS kommune,
        lower(trim(el->>'county')) AS region
      FROM "Job", jsonb_array_elements("workLocations") el
      WHERE "isActive" AND "workLocations" IS NOT NULL
        AND COALESCE(nullif(trim(el->>'municipal'), ''), nullif(trim(el->>'city'), '')) IS NOT NULL
    `;
    const seen = new Map<string, RegisterEntry>();
    for (const row of rows) {
      if (!isValidFacet(row.kommune)) continue;
      const dbValue = row.kommune;
      if (seen.has(dbValue) && seen.get(dbValue)?.fylkeSlug) continue;
      const fylke = row.region ? fylkeByDbValue(row.region) : undefined;
      seen.set(dbValue, {
        slug: slugifyNb(dbValue),
        dbValue,
        // displayPlace normaliserer kun UPPERCASE → løft først.
        label: displayPlace(dbValue.toLocaleUpperCase("nb-NO")),
        fylkeSlug: fylke?.slug,
      });
    }
    return dedupeSlugs(
      [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, "nb-NO")),
    );
  }));
}

export function getKategoriRegister(): Promise<RegisterEntry[]> {
  return registerCache("kategori", () => withHeavyQueryGate(async () => {
    const rows = await prisma.job.groupBy({
      by: ["category"],
      where: { isActive: true, category: { not: null } },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
    });
    const seen = new Map<string, RegisterEntry>();
    for (const row of rows) {
      if (!isValidFacet(row.category)) continue;
      const dbValue = row.category.trim().toLocaleLowerCase("nb-NO");
      if (seen.has(dbValue)) continue;
      seen.set(dbValue, {
        slug: KATEGORI_OVERRIDES[dbValue] ?? slugifyNb(dbValue),
        dbValue,
        label: formatCategory(row.category),
      });
    }
    return [...seen.values()];
  }));
}

/**
 * Kuraterte /jobb-kombinasjoner for sitemap: alle fylker med treff,
 * kategorier med >= 5 treff, og fylke×kategori-par med >= 5 treff
 * (topp 500 etter antall). Speiler indekserings-reglene i seo.ts.
 */
const comboCache =
  createSingleFlightCache<{ fylke?: string; kategori?: string }[]>(3_600_000);

// NB: ikke withHeavyQueryGate her — funksjonen kaller getKategoriRegister()
// (som selv tar gate-slott); nestede slott kan vranglåse. Sitemap-only og
// single-flight, så konkurransen er uansett ~1.
export function getCuratedCombos(): Promise<{ fylke?: string; kategori?: string }[]> {
  return comboCache("combos", async () => {
    const MIN_KATEGORI = 5;
    const MIN_PAIR = 5;
    const MAX_PAIRS = 500;

    // Fylke-tellinger over regioner[] (alle arbeidssteder), jf. RPC v2.
    const [fylkeRows, kategoriRows, pairRows, kategorier] = await Promise.all([
      prisma.$queryRaw<{ region: string; n: bigint }[]>`
        SELECT r AS region, count(*) AS n
        FROM "Job", unnest("regioner") r
        WHERE "isActive" GROUP BY r
      `,
      prisma.job.groupBy({
        by: ["category"],
        where: { isActive: true, category: { not: null } },
        _count: { category: true },
      }),
      prisma.$queryRaw<{ region: string; category: string; n: bigint }[]>`
        SELECT r AS region, lower("category") AS category, count(*) AS n
        FROM "Job", unnest("regioner") r
        WHERE "isActive" AND "category" IS NOT NULL
        GROUP BY r, lower("category")
      `,
      getKategoriRegister(),
    ]);

    const kategoriByDb = new Map(kategorier.map((e) => [e.dbValue, e]));
    const toFylkeSlug = (region: string | null) =>
      region ? fylkeByDbValue(region.trim().toLocaleLowerCase("nb-NO"))?.slug : undefined;
    const toKategoriSlug = (category: string | null) =>
      category
        ? kategoriByDb.get(category.trim().toLocaleLowerCase("nb-NO"))?.slug
        : undefined;

    const combos: { fylke?: string; kategori?: string }[] = [];
    for (const row of fylkeRows) {
      const fylke = toFylkeSlug(row.region);
      if (fylke && Number(row.n) > 0) combos.push({ fylke });
    }
    for (const row of kategoriRows) {
      const kategori = toKategoriSlug(row.category);
      if (kategori && row._count.category >= MIN_KATEGORI) combos.push({ kategori });
    }
    const pairs = pairRows
      .filter((r) => Number(r.n) >= MIN_PAIR)
      .sort((a, b) => Number(b.n) - Number(a.n))
      .slice(0, MAX_PAIRS);
    for (const row of pairs) {
      const fylke = toFylkeSlug(row.region);
      const kategori = toKategoriSlug(row.category);
      if (fylke && kategori) combos.push({ fylke, kategori });
    }
    // Dedup (kasing-varianter av samme region kan mappe til samme slug).
    return [
      ...new Map(
        combos.map((c) => [`${c.fylke ?? ""}|${c.kategori ?? ""}`, c]),
      ).values(),
    ];
  });
}

/**
 * Slug→dbValue-indeks for URL-parsing. Bygges én gang per request fra de
 * cachede registrene og sendes inn i parseJobbSearchParams (som forblir ren).
 */
export type RegisterIndex = {
  kommune: Map<string, RegisterEntry>;
  kategori: Map<string, RegisterEntry>;
};

export async function getRegisterIndex(): Promise<RegisterIndex> {
  const [kommuner, kategorier] = await Promise.all([
    getKommuneRegister(),
    getKategoriRegister(),
  ]);
  return {
    kommune: new Map(kommuner.map((e) => [e.slug, e])),
    kategori: new Map(kategorier.map((e) => [e.slug, e])),
  };
}
