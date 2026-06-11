import Link from "next/link";

import type { JobListItem } from "@/lib/jobs/queries";

import { MatchLabel } from "./MatchLabel";

/**
 * «Anbefalt for deg» (designreferansen): panel med topp-3 matcher for
 * innloggede med CV. Vises kun uten aktive filtre på side 1.
 */
export function RecommendedRow({ jobs }: { jobs: JobListItem[] }) {
  if (jobs.length === 0) return null;
  return (
    <section aria-label="Anbefalt for deg" className="rounded-2xl bg-panel p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Anbefalt for deg
        </h2>
        <span className="text-[11px] text-ink-muted">Basert på CV-en din</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/jobb/${j.slug}`}
            prefetch
            scroll={false}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left outline-none transition-all hover:border-border-strong hover:shadow-[0_2px_10px_rgba(20,17,14,0.06)] focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <MatchLabel score={j.matchScore} loggedIn compact />
            <span className="mt-2 block truncate text-[13px] font-medium text-ink">
              {j.title}
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
              {j.employerName}
              {j.kommune ? ` · ${j.kommune}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
