import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

import { displayPlace, formatCategory, isValidFacet } from "./format";
import { slugifyNb } from "./slug";
import { fylkeByDbValue } from "./geo";

/**
 * DB-deriverte registre for kommune og kategori: slug ↔ dbValue ↔ label.
 * Deriveres fra faktiske kolonneverdier (aldri statiske lister) så de ikke
 * kan sprike fra NAVs navneformer. Cachet 1 t — vokabularet endres bare når
 * feeden introduserer nye verdier.
 */

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

export const getKommuneRegister = unstable_cache(
  async (): Promise<RegisterEntry[]> => {
    const rows = await prisma.job.groupBy({
      by: ["kommune", "region"],
      where: { isActive: true, kommune: { not: null } },
    });
    const seen = new Map<string, RegisterEntry>();
    for (const row of rows) {
      if (!isValidFacet(row.kommune)) continue;
      const dbValue = row.kommune.trim().toLocaleLowerCase("nb-NO");
      if (seen.has(dbValue)) continue;
      const fylke = row.region
        ? fylkeByDbValue(row.region.trim().toLocaleLowerCase("nb-NO"))
        : undefined;
      seen.set(dbValue, {
        slug: slugifyNb(dbValue),
        dbValue,
        label: displayPlace(row.kommune),
        fylkeSlug: fylke?.slug,
      });
    }
    return dedupeSlugs(
      [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, "nb-NO")),
    );
  },
  ["jobb-kommune-register"],
  { revalidate: 3600 },
);

export const getKategoriRegister = unstable_cache(
  async (): Promise<RegisterEntry[]> => {
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
  },
  ["jobb-kategori-register"],
  { revalidate: 3600 },
);

/**
 * Kuraterte /jobb-kombinasjoner for sitemap: alle fylker med treff,
 * kategorier med >= 5 treff, og fylke×kategori-par med >= 5 treff
 * (topp 500 etter antall). Speiler indekserings-reglene i seo.ts.
 */
export const getCuratedCombos = unstable_cache(
  async (): Promise<{ fylke?: string; kategori?: string }[]> => {
    const MIN_KATEGORI = 5;
    const MIN_PAIR = 5;
    const MAX_PAIRS = 500;

    const [fylkeRows, kategoriRows, pairRows, kategorier] = await Promise.all([
      prisma.job.groupBy({
        by: ["region"],
        where: { isActive: true, region: { not: null } },
        _count: { region: true },
      }),
      prisma.job.groupBy({
        by: ["category"],
        where: { isActive: true, category: { not: null } },
        _count: { category: true },
      }),
      prisma.job.groupBy({
        by: ["region", "category"],
        where: { isActive: true, region: { not: null }, category: { not: null } },
        _count: { _all: true },
      }),
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
      if (fylke && row._count.region > 0) combos.push({ fylke });
    }
    for (const row of kategoriRows) {
      const kategori = toKategoriSlug(row.category);
      if (kategori && row._count.category >= MIN_KATEGORI) combos.push({ kategori });
    }
    const pairs = pairRows
      .filter((r) => r._count._all >= MIN_PAIR)
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, MAX_PAIRS);
    for (const row of pairs) {
      const fylke = toFylkeSlug(row.region);
      const kategori = toKategoriSlug(row.category);
      if (fylke && kategori) combos.push({ fylke, kategori });
    }
    return combos;
  },
  ["jobb-curated-combos"],
  { revalidate: 3600 },
);

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
