import { FiSliders } from "react-icons/fi";

import type { FacetCounts } from "@/lib/jobs/facets-query";
import {
  DEFAULT_OPEN,
  FACET_GROUP_LABELS,
  SIDEBAR_ORDER,
  STATIC_FACETS,
  type FacetParam,
  type StaticFacetParam,
} from "@/lib/jobs/facet-config";
import { FYLKER } from "@/lib/jobs/geo";
import type { RegisterEntry, RegisterIndex } from "@/lib/jobs/registers";
import {
  buildJobbUrl,
  clearAll,
  clearGroup,
  countActiveFilters,
  toggleParam,
  type JobbParams,
  type MultiParamKey,
} from "@/lib/jobs/search-params";

import { FilterGroup, type FilterOptionVM } from "./FilterGroup";

const AI_DISCLAIMER =
  "Krav til utdanning, erfaring, førerkort, språk og hjemmekontor tolkes fra annonseteksten og kan inneholde feil.";

/**
 * Filtersidebar (server): samler alle 13 facettgrupper med live counts og
 * server-bygde hrefs. Innholdet gjenbrukes uendret i mobil-sheeten.
 * Wrappes i GET-form så filtrering virker uten JavaScript («Oppdater treff»).
 */
export function FilterSidebar({
  params,
  counts,
  index,
  total,
}: {
  params: JobbParams;
  counts: FacetCounts;
  index: RegisterIndex;
  total: number;
}) {
  const activeTotal = countActiveFilters(params);

  return (
    <form method="get" action="/jobb">
      {params.q && <input type="hidden" name="q" value={params.q} />}
      {params.sortering && (
        <input type="hidden" name="sortering" value={params.sortering} />
      )}
      <div className="rounded-2xl border border-border bg-surface px-4 pb-2 pt-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <FiSliders size={14} aria-hidden className="text-ink-muted" /> Filtre
          </h2>
          <span className="text-[11.5px] tabular-nums text-ink-muted">
            {total.toLocaleString("nb-NO")} treff
          </span>
        </div>

        {SIDEBAR_ORDER.map((param) => (
          <SidebarGroup
            key={param}
            param={param}
            params={params}
            counts={counts}
            index={index}
          />
        ))}

        <p className="px-1 py-3 text-[10.5px] leading-relaxed text-ink-muted">
          {AI_DISCLAIMER}
        </p>

        {activeTotal > 0 && (
          <div className="border-t border-border px-1 py-2.5">
            <a
              href={buildJobbUrl(clearAll(params))}
              className="text-[12px] font-medium text-ink underline-offset-2 hover:underline"
            >
              Nullstill alle filtre ({activeTotal})
            </a>
          </div>
        )}

        {/* No-JS-fallback: synlig kun med tastatur/uten JS-navigasjon. */}
        <button
          type="submit"
          className="sr-only focus:not-sr-only focus:mt-2 focus:inline-flex focus:rounded-full focus:border focus:border-border focus:px-3 focus:py-1.5 focus:text-[12px]"
        >
          Oppdater treff
        </button>
      </div>
    </form>
  );
}

function SidebarGroup({
  param,
  params,
  counts,
  index,
}: {
  param: FacetParam;
  params: JobbParams;
  counts: FacetCounts;
  index: RegisterIndex;
}) {
  const groupCounts = counts.counts[rpcFacetKey(param)] ?? {};
  const label = FACET_GROUP_LABELS[param];
  const defaultOpen = DEFAULT_OPEN.has(param);

  if (param === "sommerjobb") {
    return (
      <FilterGroup
        label={label}
        param="sommerjobb"
        activeCount={params.sommerjobb ? 1 : 0}
        defaultOpen={defaultOpen}
        single
        options={[
          {
            slug: "ja",
            label: "Vis bare sommerjobber",
            count: groupCounts["ja"] ?? 0,
            checked: params.sommerjobb,
            href: buildJobbUrl(toggleParam(params, "sommerjobb", "ja")),
          },
        ]}
        clearHref={buildJobbUrl(clearGroup(params, "sommerjobb"))}
      />
    );
  }

  if (param === "publisert") {
    const def = STATIC_FACETS.publisert;
    return (
      <FilterGroup
        label={label}
        param="publisert"
        activeCount={params.publisert ? 1 : 0}
        defaultOpen={defaultOpen}
        single
        options={def.options.map((o) => ({
          slug: o.slug,
          label: o.label,
          count: groupCounts[o.dbValue] ?? 0,
          checked: params.publisert === o.slug,
          href: buildJobbUrl(toggleParam(params, "publisert", o.slug)),
        }))}
        clearHref={buildJobbUrl(clearGroup(params, "publisert"))}
      />
    );
  }

  if (param === "fylke" || param === "kommune" || param === "kategori") {
    const entries: { slug: string; label: string; dbValue: string; fylkeSlug?: string }[] =
      param === "fylke"
        ? FYLKER
        : param === "kommune"
          ? sortKommuner([...index.kommune.values()], params.fylke)
          : [...index.kategori.values()];
    const active = params[param];
    const options: FilterOptionVM[] = entries.map((e) => ({
      slug: e.slug,
      label: e.label,
      count: groupCounts[e.dbValue] ?? 0,
      checked: active.includes(e.slug),
      href: buildJobbUrl(toggleParam(params, param, e.slug)),
    }));
    return (
      <FilterGroup
        label={label}
        param={param}
        activeCount={active.length}
        defaultOpen={defaultOpen}
        searchable={param !== "fylke"}
        options={options}
        clearHref={buildJobbUrl(clearGroup(params, param))}
      />
    );
  }

  const def = STATIC_FACETS[param as StaticFacetParam];
  const active = params[param as MultiParamKey];
  return (
    <FilterGroup
      label={label}
      param={param}
      activeCount={active.length}
      defaultOpen={defaultOpen}
      options={def.options.map((o) => ({
        slug: o.slug,
        label: o.label,
        count: groupCounts[o.dbValue] ?? 0,
        checked: active.includes(o.slug),
        href: buildJobbUrl(toggleParam(params, param as MultiParamKey, o.slug)),
      }))}
      clearHref={buildJobbUrl(clearGroup(params, param as MultiParamKey))}
    />
  );
}

/** RPC-ens facet-nøkler er identiske med param-navnene. */
function rpcFacetKey(param: FacetParam): string {
  return param;
}

/** Kommuner i valgte fylker først (sted-hierarkiet), deretter alfabetisk. */
function sortKommuner(
  entries: RegisterEntry[],
  selectedFylker: string[],
): RegisterEntry[] {
  if (selectedFylker.length === 0) return entries;
  const inSelected = (e: RegisterEntry) =>
    e.fylkeSlug !== undefined && selectedFylker.includes(e.fylkeSlug);
  return [...entries.filter(inSelected), ...entries.filter((e) => !inSelected(e))];
}
