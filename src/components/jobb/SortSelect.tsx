"use client";

import { FiChevronDown } from "react-icons/fi";

import {
  buildJobbUrl,
  type JobbParams,
  type SortKey,
} from "@/lib/jobs/search-params";

import { useFilterNav } from "./filters/FilterNav";

/**
 * Sortering som pill-select (designreferansen). Valg = navigasjon — listen
 * server-rendres på nytt. «Match» kun for innloggede, «Relevans» kun ved
 * fritekstsøk.
 */
export function SortSelect({
  params,
  current,
  loggedIn,
}: {
  params: JobbParams;
  current: SortKey;
  loggedIn: boolean;
}) {
  const { navigate } = useFilterNav();

  return (
    <label className="flex h-[34px] items-center gap-1.5 rounded-full border border-border bg-surface pl-3.5 pr-2 text-[12px] text-ink-soft">
      Sorter
      <select
        value={current}
        onChange={(e) =>
          navigate(
            buildJobbUrl({
              ...params,
              sortering: e.target.value as SortKey,
              side: 1,
            }),
          )
        }
        className="cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {loggedIn && <option value="match">Beste match</option>}
        <option value="nyeste">Nyeste</option>
        <option value="frist">Søknadsfrist</option>
        {params.q && <option value="relevans">Relevans</option>}
      </select>
      <FiChevronDown size={12} aria-hidden className="-ml-1 text-ink-muted" />
    </label>
  );
}
