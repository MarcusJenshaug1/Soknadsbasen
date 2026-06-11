import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { displayPlace } from "@/lib/jobs/format";
import type { RelatedJob } from "@/lib/jobs/related";

/**
 * Lignende stillinger (kategori + arbeidsgiver + region-rangert). Brukes av
 * både hurtigvisningen (2 stk) og full detaljside (4 stk). Lenkene er vanlige
 * /jobb/[slug]-lenker — i hurtigvisningen re-intercepter de (innholdet byttes
 * i modalen, historikken stables), ved direkte besøk gir de full side.
 */
export function SimilarJobs({ jobs }: { jobs: RelatedJob[] }) {
  if (jobs.length === 0) return null;
  return (
    <section aria-label="Lignende stillinger">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        Lignende stillinger
      </h3>
      <div className="flex flex-col gap-2">
        {jobs.map((j) => (
          <Link
            key={j.slug}
            href={`/jobb/${j.slug}`}
            scroll={false}
            className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-panel"
          >
            <CompanyLogo website={j.employerHomepage} name={j.employerName} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-ink">
                {j.title}
              </span>
              <span className="block truncate text-[11px] text-ink-muted">
                {j.employerName}
                {j.location ? ` · ${displayPlace(j.location)}` : ""}
              </span>
            </span>
            <FiArrowRight size={13} aria-hidden className="shrink-0 text-ink-muted" />
          </Link>
        ))}
      </div>
    </section>
  );
}
