import Link from "next/link";
import { FiX } from "react-icons/fi";

import { STATIC_FACETS, type StaticFacetParam } from "@/lib/jobs/facet-config";
import type { RegisterIndex } from "@/lib/jobs/registers";
import { paramValueLabel } from "@/lib/jobs/seo";
import {
  buildJobbUrl,
  clearAll,
  toggleParam,
  type JobbParams,
  type MultiParamKey,
} from "@/lib/jobs/search-params";

type Chip = { key: string; label: string; href: string };

/**
 * Aktive filtre som chips over listen (designreferansen — eiers valg,
 * overstyrer opprinnelig «ingen chips»-krav). Klikk fjerner valget.
 * Rene lenker → server-first, fungerer uten JS.
 */
export function ActiveChips({
  params,
  index,
}: {
  params: JobbParams;
  index: RegisterIndex;
}) {
  const chips: Chip[] = [];

  if (params.q) {
    chips.push({
      key: "q",
      label: `«${params.q}»`,
      href: buildJobbUrl({ ...params, q: "", side: 1 }),
    });
  }
  for (const key of ["fylke", "kommune", "kategori"] as const) {
    for (const slug of params[key]) {
      chips.push({
        key: `${key}:${slug}`,
        label: paramValueLabel(key, slug, index),
        href: buildJobbUrl(toggleParam(params, key, slug)),
      });
    }
  }
  for (const key of Object.keys(STATIC_FACETS) as StaticFacetParam[]) {
    if (key === "publisert") continue;
    for (const slug of params[key]) {
      const label = STATIC_FACETS[key].options.find((o) => o.slug === slug)?.label ?? slug;
      chips.push({
        key: `${key}:${slug}`,
        label,
        href: buildJobbUrl(toggleParam(params, key as MultiParamKey, slug)),
      });
    }
  }
  if (params.publisert) {
    const label =
      STATIC_FACETS.publisert.options.find((o) => o.slug === params.publisert)?.label ??
      params.publisert;
    chips.push({
      key: "publisert",
      label,
      href: buildJobbUrl(toggleParam(params, "publisert", params.publisert)),
    });
  }
  if (params.sommerjobb) {
    chips.push({
      key: "sommerjobb",
      label: "Sommerjobb",
      href: buildJobbUrl(toggleParam(params, "sommerjobb", "ja")),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          scroll={false}
          className="flex h-[28px] items-center gap-1.5 rounded-full border border-border bg-surface pl-3 pr-2 text-[11.5px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {c.label}
          <FiX size={11} aria-hidden />
          <span className="sr-only">Fjern filteret {c.label}</span>
        </Link>
      ))}
      <Link
        href={buildJobbUrl(clearAll(params))}
        scroll={false}
        className="h-[28px] px-2 text-[11.5px] leading-[28px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Nullstill alle
      </Link>
    </div>
  );
}
