import {
  ERFARING_LABELS,
  FORERKORT_INGEN_KRAV,
  FORERKORT_LABELS,
  HJEMMEKONTOR_LABELS,
  PUBLISERT_LABELS,
  SPRAK_LABELS,
  UTDANNING_LABELS,
} from "./facets";

/**
 * Konfigurasjon for de 13 facettgruppene: URL-param, gruppelabel, rekkefølge
 * og statiske verdisett (slug ↔ dbValue ↔ label). Eneste sannhetskilde for
 * sidebar-rendering, URL-parsing og chips — fylke kommer fra geo.ts og
 * kommune/kategori fra DB-registrene (registers.ts).
 *
 * dbValue er verdien RPC-en grupperer på / filters.ts sender: lowercase
 * kolonneverdi for feed-felter, kanonisk kode for ai*-felter.
 */

export type FacetOption = { slug: string; dbValue: string; label: string };

export type StaticFacetParam =
  | "publisert"
  | "omfang"
  | "ansettelsesform"
  | "sektor"
  | "hjemmekontor"
  | "utdanning"
  | "erfaring"
  | "forerkort"
  | "sprak";

export type FacetParam =
  | StaticFacetParam
  | "fylke"
  | "kommune"
  | "kategori"
  | "sommerjobb";

type StaticFacetDef = {
  param: StaticFacetParam;
  label: string;
  /** true = radioknapp-semantikk (maks ett valg). */
  single?: boolean;
  /** AI-utvunnet felt — får disclaimer-fotnote i sidebar. */
  aiDerived?: boolean;
  options: FacetOption[];
};

const opt = (slug: string, dbValue: string, label: string): FacetOption => ({
  slug,
  dbValue,
  label,
});

export const STATIC_FACETS: Record<StaticFacetParam, StaticFacetDef> = {
  publisert: {
    param: "publisert",
    label: "Publisert",
    single: true,
    options: (Object.keys(PUBLISERT_LABELS) as (keyof typeof PUBLISERT_LABELS)[]).map(
      (k) => opt(k, k, PUBLISERT_LABELS[k]),
    ),
  },
  omfang: {
    param: "omfang",
    label: "Heltid / deltid",
    options: [opt("heltid", "heltid", "Heltid"), opt("deltid", "deltid", "Deltid")],
  },
  ansettelsesform: {
    param: "ansettelsesform",
    label: "Ansettelsesform",
    options: [
      opt("fast", "fast", "Fast"),
      opt("vikariat", "vikariat", "Vikariat"),
      opt("engasjement", "engasjement", "Engasjement"),
      opt("prosjekt", "prosjekt", "Prosjekt"),
      opt("sesong", "sesong", "Sesong"),
      opt("laerling", "lærling", "Lærling"),
      opt("annet", "annet", "Annet"),
    ],
  },
  sektor: {
    param: "sektor",
    label: "Sektor",
    options: [
      opt("privat", "privat", "Privat"),
      opt("offentlig", "offentlig", "Offentlig"),
    ],
  },
  hjemmekontor: {
    param: "hjemmekontor",
    label: "Hjemmekontor",
    aiDerived: true,
    options: [
      opt("ja", "hjemmekontor", HJEMMEKONTOR_LABELS.hjemmekontor),
      opt("hybrid", "hybrid", HJEMMEKONTOR_LABELS.hybrid),
      opt("nei", "ikke-mulig", HJEMMEKONTOR_LABELS["ikke-mulig"]),
    ],
  },
  utdanning: {
    param: "utdanning",
    label: "Utdanningsnivå",
    aiDerived: true,
    options: (Object.keys(UTDANNING_LABELS) as (keyof typeof UTDANNING_LABELS)[]).map(
      (k) => opt(k, k, UTDANNING_LABELS[k]),
    ),
  },
  erfaring: {
    param: "erfaring",
    label: "Arbeidserfaring",
    aiDerived: true,
    options: (Object.keys(ERFARING_LABELS) as (keyof typeof ERFARING_LABELS)[]).map(
      (k) => opt(k, k, ERFARING_LABELS[k]),
    ),
  },
  forerkort: {
    param: "forerkort",
    label: "Førerkort",
    aiDerived: true,
    options: [
      opt("ingen-krav", FORERKORT_INGEN_KRAV, "Ingen krav"),
      ...(Object.keys(FORERKORT_LABELS) as (keyof typeof FORERKORT_LABELS)[]).map((k) =>
        opt(k.toLowerCase(), k, FORERKORT_LABELS[k]),
      ),
    ],
  },
  sprak: {
    param: "sprak",
    label: "Arbeidsspråk",
    aiDerived: true,
    options: (Object.keys(SPRAK_LABELS) as (keyof typeof SPRAK_LABELS)[]).map((k) =>
      opt(k, k, SPRAK_LABELS[k]),
    ),
  },
};

/** Sidebar-rekkefølge (designreferansen). fylke/kommune/kategori/sommerjobb håndteres egne. */
export const SIDEBAR_ORDER: FacetParam[] = [
  "publisert",
  "fylke",
  "kommune",
  "kategori",
  "sommerjobb",
  "omfang",
  "ansettelsesform",
  "sektor",
  "hjemmekontor",
  "utdanning",
  "erfaring",
  "forerkort",
  "sprak",
];

export const FACET_GROUP_LABELS: Record<FacetParam, string> = {
  publisert: "Publisert",
  fylke: "Fylke",
  kommune: "Kommune",
  kategori: "Yrkeskategori",
  sommerjobb: "Sommerjobb",
  omfang: "Heltid / deltid",
  ansettelsesform: "Ansettelsesform",
  sektor: "Sektor",
  hjemmekontor: "Hjemmekontor",
  utdanning: "Utdanningsnivå",
  erfaring: "Arbeidserfaring",
  forerkort: "Førerkort",
  sprak: "Arbeidsspråk",
};

/** Grupper som er åpne by default i sidebar (designreferansen). */
export const DEFAULT_OPEN: ReadonlySet<FacetParam> = new Set([
  "publisert",
  "fylke",
  "kategori",
  "sommerjobb",
]);

export function staticOptionBySlug(
  param: StaticFacetParam,
  slug: string,
): FacetOption | undefined {
  return STATIC_FACETS[param].options.find((o) => o.slug === slug);
}

export function staticOptionByDbValue(
  param: StaticFacetParam,
  dbValue: string,
): FacetOption | undefined {
  return STATIC_FACETS[param].options.find((o) => o.dbValue === dbValue);
}
