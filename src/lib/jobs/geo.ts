/**
 * Statisk fylkesregister (2024-strukturen, 15 fylker) med nabofylker for
 * 0-treff-forslag («Prøv Trøndelag →»). dbValue = lower(NAVs region-verdi);
 * NAV bruker fylkesnavn i UPPERCASE i feeden, RPC-en grupperer på lower().
 *
 * Kommuner og kategorier er bevisst IKKE statiske — de deriveres fra faktiske
 * DB-verdier (src/lib/jobs/registers.ts) så de aldri kan sprike fra NAVs
 * navneformer (samiske dobbeltnavn, sammenslåinger osv.).
 */

export type Fylke = {
  slug: string;
  dbValue: string;
  label: string;
  /** Geografisk tilgrensende fylker (slugs), for 0-treff-forslag. */
  neighbors: string[];
};

export const FYLKER: Fylke[] = [
  { slug: "oslo", dbValue: "oslo", label: "Oslo", neighbors: ["akershus"] },
  {
    slug: "akershus",
    dbValue: "akershus",
    label: "Akershus",
    neighbors: ["oslo", "ostfold", "buskerud", "innlandet"],
  },
  { slug: "ostfold", dbValue: "østfold", label: "Østfold", neighbors: ["akershus"] },
  {
    slug: "buskerud",
    dbValue: "buskerud",
    label: "Buskerud",
    neighbors: ["akershus", "innlandet", "vestland", "telemark", "vestfold"],
  },
  {
    slug: "innlandet",
    dbValue: "innlandet",
    label: "Innlandet",
    neighbors: ["akershus", "buskerud", "vestland", "more-og-romsdal", "trondelag"],
  },
  {
    slug: "vestfold",
    dbValue: "vestfold",
    label: "Vestfold",
    neighbors: ["buskerud", "telemark"],
  },
  {
    slug: "telemark",
    dbValue: "telemark",
    label: "Telemark",
    neighbors: ["vestfold", "buskerud", "agder", "rogaland", "vestland"],
  },
  {
    slug: "agder",
    dbValue: "agder",
    label: "Agder",
    neighbors: ["telemark", "rogaland"],
  },
  {
    slug: "rogaland",
    dbValue: "rogaland",
    label: "Rogaland",
    neighbors: ["agder", "vestland", "telemark"],
  },
  {
    slug: "vestland",
    dbValue: "vestland",
    label: "Vestland",
    neighbors: ["rogaland", "more-og-romsdal", "innlandet", "buskerud", "telemark"],
  },
  {
    slug: "more-og-romsdal",
    dbValue: "møre og romsdal",
    label: "Møre og Romsdal",
    neighbors: ["vestland", "innlandet", "trondelag"],
  },
  {
    slug: "trondelag",
    dbValue: "trøndelag",
    label: "Trøndelag",
    neighbors: ["innlandet", "more-og-romsdal", "nordland"],
  },
  {
    slug: "nordland",
    dbValue: "nordland",
    label: "Nordland",
    neighbors: ["trondelag", "troms"],
  },
  { slug: "troms", dbValue: "troms", label: "Troms", neighbors: ["nordland", "finnmark"] },
  { slug: "finnmark", dbValue: "finnmark", label: "Finnmark", neighbors: ["troms"] },
];

const BY_SLUG = new Map(FYLKER.map((f) => [f.slug, f]));
const BY_DB = new Map(FYLKER.map((f) => [f.dbValue, f]));

export function fylkeBySlug(slug: string): Fylke | undefined {
  return BY_SLUG.get(slug);
}

/** Oppslag fra lower(region)-verdi (slik RPC-en returnerer dem). */
export function fylkeByDbValue(dbValue: string): Fylke | undefined {
  return BY_DB.get(dbValue);
}
