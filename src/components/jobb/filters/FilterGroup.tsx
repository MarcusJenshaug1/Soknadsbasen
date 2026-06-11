"use client";

import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";

import { CheckboxRow } from "@/components/ui/Checkbox";
import { Collapsible } from "@/components/ui/Collapsible";

import { useFilterNav } from "./FilterNav";

/** Serialiserbar visningsmodell per valg — href-ene bygges server-side. */
export type FilterOptionVM = {
  slug: string;
  label: string;
  count: number;
  checked: boolean;
  href: string;
};

/**
 * Én facettgruppe: collapsible fieldset med antall-badge, valgfri inline-søk
 * (kommune) og «Nullstill». 0-treff dimmes med (0) men skjules ikke.
 */
export function FilterGroup({
  label,
  param,
  options,
  activeCount,
  defaultOpen,
  single = false,
  searchable = false,
  clearHref,
  footnote,
}: {
  label: string;
  param: string;
  options: FilterOptionVM[];
  activeCount: number;
  defaultOpen: boolean;
  single?: boolean;
  searchable?: boolean;
  clearHref?: string;
  footnote?: string;
}) {
  const { navigate } = useFilterNav();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    if (!searchable) return options;
    const q = query.trim().toLocaleLowerCase("nb-NO");
    const hits = q
      ? options.filter((o) => o.label.toLocaleLowerCase("nb-NO").includes(q))
      : options;
    // Uten søk: avhukede + de 30 første — fulle kommunelister er for lange.
    return q ? hits.slice(0, 50) : [...hits.filter((o) => o.checked), ...hits.filter((o) => !o.checked)].slice(0, 30);
  }, [options, query, searchable]);

  return (
    <fieldset className="border-b border-border py-1.5 last:border-b-0">
      <legend className="sr-only">{label}</legend>
      <Collapsible
        defaultOpen={defaultOpen || activeCount > 0}
        header={
          <>
            {label}
            {activeCount > 0 && (
              <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </>
        }
      >
        <div className="px-1 pb-3">
          {searchable && (
            <div className="relative mb-2">
              <FiSearch
                size={13}
                aria-hidden
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Søk ${label.toLocaleLowerCase("nb-NO")}`}
                aria-label={`Søk i ${label.toLocaleLowerCase("nb-NO")}`}
                className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2 text-[12.5px] text-ink placeholder:text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              />
            </div>
          )}
          <div className="flex flex-col">
            {visible.map((o) => (
              <CheckboxRow
                key={o.slug}
                label={o.label}
                checked={o.checked}
                count={o.count}
                single={single}
                name={param}
                value={o.slug}
                dimmed={o.count === 0 && !o.checked}
                onChange={() => navigate(o.href)}
              />
            ))}
            {visible.length === 0 && (
              <p className="py-1 text-[12px] text-ink-muted">
                Ingen treff på «{query}»
              </p>
            )}
          </div>
          {activeCount > 0 && clearHref && (
            <button
              type="button"
              onClick={() => navigate(clearHref)}
              className="mt-1 px-1 text-[11.5px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Nullstill {label.toLocaleLowerCase("nb-NO")}
            </button>
          )}
          {footnote && (
            <p className="mt-2 px-1 text-[10.5px] leading-relaxed text-ink-muted">
              {footnote}
            </p>
          )}
        </div>
      </Collapsible>
    </fieldset>
  );
}
