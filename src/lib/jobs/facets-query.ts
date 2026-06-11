import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { facetRpcParams, type JobbFilter } from "./filters";

/**
 * Alle facett-counts for gjeldende filter, gruppert per facettnøkkel, pluss
 * total treffmengde — fra ÉN job_facet_counts()-rundtur (se migrasjonen
 * 20260611193000_job_facet_counts_fn for semantikk og ytelsesdesign).
 */
export type FacetCounts = {
  total: number;
  /** counts[facet][verdi] = antall. Verdier er lowercase (lower(kolonne)/koder). */
  counts: Record<string, Record<string, number>>;
};

type FacetCountRow = { facet: string; value: string; n: bigint };

/**
 * cache()-wrappet så page + generateMetadata + sidebar deler én rundtur per
 * request (samme regel som getSessionWithAccess).
 */
export const getFacetCounts = cache(
  async (filter: JobbFilter): Promise<FacetCounts> => {
    const p = facetRpcParams(filter);

    // Eksplisitte casts på ALLE parametre: Prisma sender Date som timestamptz
    // og null som unknown — uten casts matcher ikke funksjonssignaturen
    // (verifisert i prod: 42883 «does not exist»).
    const rows = await prisma.$queryRaw<FacetCountRow[]>`
      SELECT facet, value, n FROM job_facet_counts(
        ${p.q}::text,
        ${p.fylke}::text[],
        ${p.kommune}::text[],
        ${p.kategori}::text[],
        ${p.publisertEtter}::timestamp,
        ${p.utdanning}::text[],
        ${p.erfaring}::text[],
        ${p.forerkort}::text[],
        ${p.sprak}::text[],
        ${p.omfang}::text[],
        ${p.sommerjobb}::boolean,
        ${p.ansettelsesform}::text[],
        ${p.sektor}::text[],
        ${p.hjemmekontor}::text[]
      )
    `;

    const counts: Record<string, Record<string, number>> = {};
    let total = 0;
    for (const row of rows) {
      const n = Number(row.n);
      if (row.facet === "total") {
        total = n;
        continue;
      }
      (counts[row.facet] ??= {})[row.value] = n;
    }
    return { total, counts };
  },
);
