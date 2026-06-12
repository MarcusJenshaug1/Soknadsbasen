import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { facetRpcParams, type JobbFilter } from "./filters";
import { withHeavyQueryGate } from "./heavy-query-gate";
import { createSingleFlightCache } from "./single-flight-cache";

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

// 3 min TTL per filterkombinasjon: feeden synces hvert 5. min, så ferskere
// counts finnes ikke — og uten denne kjøres RPC-en per pageview, som under
// bot-crawl av facet-URL-er ga ubegrenset DB-etterspørsel (hendelsen
// 2026-06-12). maxEntries begrenser minne under crawl av lange kombo-haler.
const facetCountsCache = createSingleFlightCache<FacetCounts>(180_000, 1000);

/**
 * cache()-wrappet så page + generateMetadata + sidebar deler én rundtur per
 * request (samme regel som getSessionWithAccess).
 */
export const getFacetCounts = cache(
  async (filter: JobbFilter): Promise<FacetCounts> => {
    const p = facetRpcParams(filter);
    return facetCountsCache(JSON.stringify(p), () =>
      withHeavyQueryGate(() => loadFacetCounts(p)),
    );
  },
);

async function loadFacetCounts(
  p: ReturnType<typeof facetRpcParams>,
): Promise<FacetCounts> {
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
}
