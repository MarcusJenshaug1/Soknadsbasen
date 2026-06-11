import Link from "next/link";
import { FiArrowRight, FiSearch } from "react-icons/fi";

import type { FacetCounts } from "@/lib/jobs/facets-query";
import { fylkeBySlug } from "@/lib/jobs/geo";
import type { RegisterIndex } from "@/lib/jobs/registers";
import {
  EMPTY_PARAMS,
  buildJobbUrl,
  clearAll,
  toggleParam,
  type JobbParams,
} from "@/lib/jobs/search-params";

/**
 * 0 treff er aldri en blindvei: foreslå nabofylker (med faktiske treffantall
 * fra facett-RPC-en, som ekskluderer fylke-filteret), populære kategorier og
 * nullstilling. «Lagre dette søket» kobles på i Fase 3.
 */
export function EmptyState({
  params,
  counts,
  index,
}: {
  params: JobbParams;
  counts: FacetCounts;
  index: RegisterIndex;
}) {
  const fylkeCounts = counts.counts["fylke"] ?? {};
  const neighborSuggestions =
    params.fylke.length === 1
      ? (fylkeBySlug(params.fylke[0])?.neighbors ?? [])
          .map((slug) => {
            const f = fylkeBySlug(slug);
            const n = f ? (fylkeCounts[f.dbValue] ?? 0) : 0;
            return f && n > 0 ? { ...f, n } : null;
          })
          .filter((f): f is NonNullable<typeof f> => f !== null)
          .slice(0, 3)
      : [];

  const popular = [...index.kategori.values()].slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-surface px-8 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-panel text-ink-muted">
        <FiSearch size={20} aria-hidden />
      </div>
      <h3 className="text-[17px] font-medium text-ink">Ingen stillinger matcher</h3>
      <p className="mx-auto mt-1.5 max-w-[400px] text-[13px] leading-relaxed text-ink-soft">
        Prøv å fjerne et filter{params.q ? " eller endre søkeordet" : ""}, eller se
        forslagene under.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {neighborSuggestions.map((f) => (
          <Link
            key={f.slug}
            href={buildJobbUrl(
              toggleParam(toggleParam(params, "fylke", params.fylke[0]), "fylke", f.slug),
            )}
            scroll={false}
            className="flex h-[32px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[12px] font-medium text-ink transition-colors hover:border-ink"
          >
            Prøv {f.label} ({f.n.toLocaleString("nb-NO")})
            <FiArrowRight size={12} aria-hidden />
          </Link>
        ))}
        <Link
          href={buildJobbUrl(clearAll(params))}
          scroll={false}
          className="flex h-[32px] items-center rounded-full border border-border px-3.5 text-[12px] font-medium text-ink transition-colors hover:border-ink"
        >
          Nullstill filtre
        </Link>
      </div>
      {popular.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Populære søk
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {popular.map((k) => (
              <Link
                key={k.slug}
                href={buildJobbUrl({ ...EMPTY_PARAMS, kategori: [k.slug] })}
                className="inline-flex h-[26px] items-center rounded-full bg-panel px-3 text-[11.5px] text-ink-soft transition-colors hover:text-ink"
              >
                {k.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
