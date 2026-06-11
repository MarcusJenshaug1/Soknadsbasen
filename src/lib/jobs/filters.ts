import "server-only";

import { Prisma } from "@prisma/client";

import { PUBLISERT_BUCKETS, FORERKORT_INGEN_KRAV, type PublisertBucket } from "./facets";

/**
 * Normalisert filtertilstand for /jobb. Verdiene er lowercase DB-verdier
 * (region/kategori/extent/engagementType/sector sammenlignes med lower(kolonne);
 * ai*-kodene er allerede lowercase i DB). Slug↔DB-mapping skjer i URL-laget
 * (Fase 1) — dette laget er URL-agnostisk.
 *
 * Samme objekt driver BÅDE liste-spørringen (jobWhereSql) og facett-RPC-en
 * (getFacetCounts), så treffliste og counts aldri kan sprike.
 */
export type JobbFilter = {
  q?: string;
  fylke?: string[];
  kommune?: string[];
  kategori?: string[];
  publisert?: PublisertBucket;
  utdanning?: string[];
  erfaring?: string[];
  forerkort?: string[]; // koder + ev. "ingen-krav"
  sprak?: string[];
  omfang?: string[]; // "heltid" | "deltid"
  sommerjobb?: boolean;
  ansettelsesform?: string[];
  sektor?: string[];
  hjemmekontor?: string[];
};

/** Publisert-bucket → UTC-cutoff. Prisma lagrer DateTime som UTC-timestamp. */
export function publisertCutoff(bucket: PublisertBucket | undefined): Date | null {
  if (!bucket) return null;
  const days = PUBLISERT_BUCKETS[bucket];
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const nonEmpty = (values: string[] | undefined): string[] | null =>
  values && values.length > 0 ? values : null;

/**
 * WHERE-fragment (uten nøkkelordet WHERE) for liste-/count-spørringer mot
 * "Job" med alias j. Inkluderer alltid j."isActive". Raw SQL er nødvendig
 * fordi searchVector er Unsupported i Prisma og array-facettene bruker &&.
 */
export function jobWhereSql(f: JobbFilter): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`j."isActive"`];

  const q = f.q?.trim();
  if (q) {
    conds.push(
      Prisma.sql`j."searchVector" @@ websearch_to_tsquery('norwegian', ${q})`,
    );
  }

  const fylke = nonEmpty(f.fylke);
  if (fylke) conds.push(Prisma.sql`lower(j."region") = ANY(${fylke}::text[])`);

  const kommune = nonEmpty(f.kommune);
  if (kommune) conds.push(Prisma.sql`lower(j."kommune") = ANY(${kommune}::text[])`);

  const kategori = nonEmpty(f.kategori);
  if (kategori) conds.push(Prisma.sql`lower(j."category") = ANY(${kategori}::text[])`);

  const cutoff = publisertCutoff(f.publisert);
  if (cutoff) conds.push(Prisma.sql`j."publishedAt" >= ${cutoff}`);

  const utdanning = nonEmpty(f.utdanning);
  if (utdanning) conds.push(Prisma.sql`j."aiEducation" && ${utdanning}::text[]`);

  const erfaring = nonEmpty(f.erfaring);
  if (erfaring) conds.push(Prisma.sql`j."aiExperience" = ANY(${erfaring}::text[])`);

  const forerkort = nonEmpty(f.forerkort);
  if (forerkort) {
    // "ingen-krav" = tom aiDriversLicense, men kun for beriket rader —
    // før berikelse betyr tom array «ukjent», ikke «ingen krav».
    const codes = forerkort.filter((v) => v !== FORERKORT_INGEN_KRAV);
    const wantsNone = forerkort.includes(FORERKORT_INGEN_KRAV);
    const branches: Prisma.Sql[] = [];
    if (codes.length > 0) {
      branches.push(Prisma.sql`j."aiDriversLicense" && ${codes}::text[]`);
    }
    if (wantsNone) {
      branches.push(
        Prisma.sql`(cardinality(j."aiDriversLicense") = 0 AND j."aiFacetsAt" IS NOT NULL)`,
      );
    }
    conds.push(Prisma.sql`(${Prisma.join(branches, " OR ")})`);
  }

  const sprak = nonEmpty(f.sprak);
  if (sprak) conds.push(Prisma.sql`j."aiWorkLanguages" && ${sprak}::text[]`);

  const omfang = nonEmpty(f.omfang);
  if (omfang) conds.push(Prisma.sql`lower(j."extent") = ANY(${omfang}::text[])`);

  if (f.sommerjobb) conds.push(Prisma.sql`j."isSummerJob"`);

  const ansettelsesform = nonEmpty(f.ansettelsesform);
  if (ansettelsesform) {
    conds.push(Prisma.sql`lower(j."engagementType") = ANY(${ansettelsesform}::text[])`);
  }

  const sektor = nonEmpty(f.sektor);
  if (sektor) conds.push(Prisma.sql`lower(j."sector") = ANY(${sektor}::text[])`);

  const hjemmekontor = nonEmpty(f.hjemmekontor);
  if (hjemmekontor) {
    conds.push(Prisma.sql`j."aiRemote" = ANY(${hjemmekontor}::text[])`);
  }

  return Prisma.join(conds, " AND ");
}

/**
 * Parametre til job_facet_counts() i deklarert rekkefølge. NULL = gruppen er
 * uten aktive valg (ingen begrensning). Holdes her, vegg i vegg med
 * jobWhereSql, så de to aldri tolker JobbFilter ulikt.
 */
export function facetRpcParams(f: JobbFilter) {
  return {
    q: f.q?.trim() || null,
    fylke: nonEmpty(f.fylke),
    kommune: nonEmpty(f.kommune),
    kategori: nonEmpty(f.kategori),
    publisertEtter: publisertCutoff(f.publisert),
    utdanning: nonEmpty(f.utdanning),
    erfaring: nonEmpty(f.erfaring),
    forerkort: nonEmpty(f.forerkort),
    sprak: nonEmpty(f.sprak),
    omfang: nonEmpty(f.omfang),
    sommerjobb: f.sommerjobb ? true : null,
    ansettelsesform: nonEmpty(f.ansettelsesform),
    sektor: nonEmpty(f.sektor),
    hjemmekontor: nonEmpty(f.hjemmekontor),
  };
}
