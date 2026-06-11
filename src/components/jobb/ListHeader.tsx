import { PAGE_SIZE } from "@/lib/jobs/queries";
import {
  buildJobbUrl,
  countActiveFilters,
  type JobbParams,
  type SortKey,
} from "@/lib/jobs/search-params";

import type { Density } from "./JobCard";
import { DensityToggle, VisitTracker } from "./DensityToggle";
import { SaveSearchButton } from "./SaveSearchButton";
import { SortSelect } from "./SortSelect";

/** Smal mellomrom som tusenskille (designreferansen). */
export function fmtCount(n: number): string {
  return n.toLocaleString("nb-NO").replace(/\s/g, " ");
}

/**
 * Listehode: treffantall (aria-live), sortering og tetthet. «Lagre søk»
 * kobles på i Fase 3.
 */
export function ListHeader({
  total,
  params,
  sort,
  loggedIn,
  density,
  suggestedSearchName,
}: {
  total: number;
  params: JobbParams;
  sort: SortKey;
  loggedIn: boolean;
  density: Density;
  suggestedSearchName: string;
}) {
  const from = total === 0 ? 0 : (params.side - 1) * PAGE_SIZE + 1;
  const to = Math.min(params.side * PAGE_SIZE, total);
  const query = buildJobbUrl({ ...params, side: 1, sortering: null }).replace(
    /^\/jobb\??/,
    "",
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-[13px] text-ink-soft">
        <strong className="font-semibold text-ink">{fmtCount(total)}</strong> ledige
        stillinger
        {total > 0 && (
          <span className="text-ink-muted">
            {" "}
            · viser {fmtCount(from)}–{fmtCount(to)}
          </span>
        )}
      </p>
      <div className="flex items-center gap-2">
        {countActiveFilters(params) > 0 && (
          <SaveSearchButton
            query={query}
            suggestedName={suggestedSearchName}
            loggedIn={loggedIn}
          />
        )}
        <SortSelect params={params} current={sort} loggedIn={loggedIn} />
        <DensityToggle current={density} />
      </div>
      <VisitTracker />
    </div>
  );
}
