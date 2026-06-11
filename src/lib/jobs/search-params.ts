import { PUBLISERT_BUCKETS, type PublisertBucket } from "./facets";
import {
  STATIC_FACETS,
  staticOptionBySlug,
  type StaticFacetParam,
} from "./facet-config";
import { FYLKER, fylkeBySlug } from "./geo";
import type { RegisterIndex } from "./registers";
import type { JobbFilter } from "./filters";

/**
 * URL-laget for /jobb: parse av searchParams → (slugs + DB-filter), kanonisk
 * URL-bygging og toggle-hjelpere. Rene funksjoner — RegisterIndex (kommune/
 * kategori-oppslag) sendes inn, ingen IO her.
 *
 * Kontrakt: ALLE hrefs i modulen bygges av buildJobbUrl, så kanonisk
 * sammenligning i SEO-laget er ren strengelikhet.
 */

export type SortKey = "match" | "nyeste" | "frist" | "relevans";

const SORT_KEYS: ReadonlySet<string> = new Set(["match", "nyeste", "frist", "relevans"]);

/** Param-tilstand som slugs — det URL-er bygges fra. */
export type JobbParams = {
  q: string;
  fylke: string[];
  kommune: string[];
  kategori: string[];
  omfang: string[];
  ansettelsesform: string[];
  sektor: string[];
  hjemmekontor: string[];
  publisert: PublisertBucket | null;
  utdanning: string[];
  erfaring: string[];
  forerkort: string[];
  sprak: string[];
  sommerjobb: boolean;
  sortering: SortKey | null;
  side: number;
};

export type MultiParamKey =
  | "fylke"
  | "kommune"
  | "kategori"
  | "omfang"
  | "ansettelsesform"
  | "sektor"
  | "hjemmekontor"
  | "utdanning"
  | "erfaring"
  | "forerkort"
  | "sprak";

export const EMPTY_PARAMS: JobbParams = {
  q: "",
  fylke: [],
  kommune: [],
  kategori: [],
  omfang: [],
  ansettelsesform: [],
  sektor: [],
  hjemmekontor: [],
  publisert: null,
  utdanning: [],
  erfaring: [],
  forerkort: [],
  sprak: [],
  sommerjobb: false,
  sortering: null,
  side: 1,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

/** Godtar både kommaseparert og repetert param (no-JS GET-form gir repetert). */
function rawValues(raw: RawSearchParams, key: string): string[] {
  const v = raw[key];
  if (!v) return [];
  const list = Array.isArray(v) ? v : [v];
  return list
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function knownSlugs(values: string[], lookup: (slug: string) => boolean): string[] {
  return [...new Set(values.filter(lookup))].sort();
}

export type ParsedJobb = {
  params: JobbParams;
  /** DB-filter for liste + facett-RPC (filters.ts-kontrakten). */
  filter: JobbFilter;
  /** Legacy-params (?region=&sort=, rå kategori-verdier) → 308 mot ny URL. */
  redirectTo: string | null;
};

export function parseJobbSearchParams(
  raw: RawSearchParams,
  index: RegisterIndex,
): ParsedJobb {
  const params: JobbParams = {
    ...EMPTY_PARAMS,
    q: rawValues(raw, "q").join(" ").slice(0, 200),
    fylke: knownSlugs(rawValues(raw, "fylke"), (s) => fylkeBySlug(s) !== undefined),
    kommune: knownSlugs(rawValues(raw, "kommune"), (s) => index.kommune.has(s)),
    kategori: knownSlugs(rawValues(raw, "kategori"), (s) => index.kategori.has(s)),
    sommerjobb: rawValues(raw, "sommerjobb")[0] === "ja",
    side: Math.max(1, Math.min(500, Number(rawValues(raw, "side")[0]) || 1)),
  };

  for (const key of Object.keys(STATIC_FACETS) as StaticFacetParam[]) {
    if (key === "publisert") continue;
    params[key] = knownSlugs(
      rawValues(raw, key),
      (s) => staticOptionBySlug(key, s) !== undefined,
    );
  }
  const pub = rawValues(raw, "publisert")[0];
  params.publisert = pub && pub in PUBLISERT_BUCKETS ? (pub as PublisertBucket) : null;

  const sort = rawValues(raw, "sortering")[0];
  params.sortering = SORT_KEYS.has(sort) ? (sort as SortKey) : null;
  // relevans gir bare mening med fritekst.
  if (params.sortering === "relevans" && !params.q) params.sortering = null;

  return {
    params,
    filter: toFilter(params, index),
    redirectTo: legacyRedirect(raw, params, index),
  };
}

/** JobbParams (slugs) → JobbFilter (lowercase DB-verdier/koder). */
export function toFilter(params: JobbParams, index: RegisterIndex): JobbFilter {
  const mapStatic = (key: StaticFacetParam, slugs: string[]) =>
    slugs
      .map((s) => staticOptionBySlug(key, s)?.dbValue)
      .filter((v): v is string => Boolean(v));
  return {
    q: params.q || undefined,
    fylke: params.fylke
      .map((s) => fylkeBySlug(s)?.dbValue)
      .filter((v): v is string => Boolean(v)),
    kommune: params.kommune
      .map((s) => index.kommune.get(s)?.dbValue)
      .filter((v): v is string => Boolean(v)),
    kategori: params.kategori
      .map((s) => index.kategori.get(s)?.dbValue)
      .filter((v): v is string => Boolean(v)),
    publisert: params.publisert ?? undefined,
    utdanning: mapStatic("utdanning", params.utdanning),
    erfaring: mapStatic("erfaring", params.erfaring),
    forerkort: mapStatic("forerkort", params.forerkort),
    sprak: mapStatic("sprak", params.sprak),
    omfang: mapStatic("omfang", params.omfang),
    sommerjobb: params.sommerjobb || undefined,
    ansettelsesform: mapStatic("ansettelsesform", params.ansettelsesform),
    sektor: mapStatic("sektor", params.sektor),
    hjemmekontor: mapStatic("hjemmekontor", params.hjemmekontor),
  };
}

/** Kanonisk param-rekkefølge. visning (tetthet) er bevisst ALDRI URL-param. */
const URL_ORDER: (keyof JobbParams)[] = [
  "q",
  "fylke",
  "kommune",
  "kategori",
  "omfang",
  "ansettelsesform",
  "sektor",
  "hjemmekontor",
  "publisert",
  "utdanning",
  "erfaring",
  "forerkort",
  "sprak",
  "sommerjobb",
  "sortering",
  "side",
];

export function buildJobbUrl(params: JobbParams): string {
  const qs = new URLSearchParams();
  for (const key of URL_ORDER) {
    const v = params[key];
    if (key === "q" && v) qs.set("q", v as string);
    else if (key === "sommerjobb" && v) qs.set("sommerjobb", "ja");
    else if (key === "publisert" && v) qs.set("publisert", v as string);
    else if (key === "sortering" && v) qs.set("sortering", v as string);
    else if (key === "side" && (v as number) > 1) qs.set("side", String(v));
    else if (Array.isArray(v) && v.length > 0) qs.set(key, [...v].sort().join(","));
  }
  const s = qs.toString();
  return s ? `/jobb?${s}` : "/jobb";
}

/** Toggler ett valg. Nullstiller side (nytt resultatsett). */
export function toggleParam(
  params: JobbParams,
  key: MultiParamKey | "publisert" | "sommerjobb",
  slug: string,
): JobbParams {
  const next: JobbParams = { ...params, side: 1 };
  if (key === "sommerjobb") {
    next.sommerjobb = !params.sommerjobb;
  } else if (key === "publisert") {
    next.publisert =
      params.publisert === slug ? null : ((slug in PUBLISERT_BUCKETS
        ? slug
        : null) as PublisertBucket | null);
  } else {
    const cur = params[key];
    next[key] = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
  }
  return next;
}

export function clearGroup(
  params: JobbParams,
  key: MultiParamKey | "publisert" | "sommerjobb",
): JobbParams {
  const next: JobbParams = { ...params, side: 1 };
  if (key === "sommerjobb") next.sommerjobb = false;
  else if (key === "publisert") next.publisert = null;
  else next[key] = [];
  return next;
}

export function clearAll(params: JobbParams): JobbParams {
  return { ...EMPTY_PARAMS, sortering: params.sortering };
}

export function countActiveFilters(params: JobbParams): number {
  let n = params.q ? 1 : 0;
  if (params.publisert) n += 1;
  if (params.sommerjobb) n += 1;
  for (const key of [
    "fylke",
    "kommune",
    "kategori",
    "omfang",
    "ansettelsesform",
    "sektor",
    "hjemmekontor",
    "utdanning",
    "erfaring",
    "forerkort",
    "sprak",
  ] as const) {
    n += params[key].length;
  }
  return n;
}

/**
 * Gammelt URL-skjema (?q=&region=&kategori=<råverdi>&sort=&side=) → nytt.
 * region var rå DB-verdi (case-insensitiv), kategori rå kategoritekst,
 * sort recent|match. Returnerer ny kanonisk URL eller null.
 */
function legacyRedirect(
  raw: RawSearchParams,
  parsed: JobbParams,
  index: RegisterIndex,
): string | null {
  const region = rawValues(raw, "region")[0];
  const sort = rawValues(raw, "sort")[0];
  // Kategori-verdier som ikke er gyldige nye slugs = legacy råverdier.
  const unknownKategori = rawValues(raw, "kategori").filter(
    (v) => !index.kategori.has(v),
  );

  if (!region && !sort && unknownKategori.length === 0) return null;

  const next: JobbParams = { ...parsed };
  if (region) {
    const lower = region.trim().toLocaleLowerCase("nb-NO");
    const hit = FYLKER.find((f) => f.dbValue === lower);
    if (hit && !next.fylke.includes(hit.slug)) next.fylke = [...next.fylke, hit.slug].sort();
  }
  for (const v of unknownKategori) {
    const lower = v.trim().toLocaleLowerCase("nb-NO");
    const hit = [...index.kategori.values()].find((e) => e.dbValue === lower);
    if (hit && !next.kategori.includes(hit.slug)) {
      next.kategori = [...next.kategori, hit.slug].sort();
    }
  }
  if (sort === "match") next.sortering = "match";
  else if (sort === "recent") next.sortering = null;

  return buildJobbUrl(next);
}
