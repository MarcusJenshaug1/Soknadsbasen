import Link from "next/link";
import { FiStar } from "react-icons/fi";

import { matchTier, MATCH_THRESHOLDS } from "@/lib/jobs/match";
import type { RecommendedJob } from "@/lib/jobs/queries";
import { cn } from "@/lib/cn";

import { MatchLabel } from "./MatchLabel";

const FRIST_FMT = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" });

const TIER_EDGE = {
  hoy: "bg-success-ink/60",
  middels: "bg-accent-ink/50",
  lav: "bg-border-strong",
} as const;

/**
 * Visuelt ærlig bar-bredde forankret i tier-tersklene, IKKE rå prosent —
 * scorene er kalibrert med Høy ≥ 35, så «42 %» ville sett dårlig ut for en
 * høy match. Middels-terskel = 40 %, 70+ = full bredde.
 */
function tierWidth(score: number): number {
  if (score >= 70) return 100;
  if (score >= MATCH_THRESHOLDS.middels) {
    return 40 + ((score - MATCH_THRESHOLDS.middels) / (70 - MATCH_THRESHOLDS.middels)) * 60;
  }
  return 10 + (score / MATCH_THRESHOLDS.middels) * 30;
}

/**
 * «Anbefalt for deg» (designreferansen): panel med topp-3 matcher for
 * innloggede med CV. Vises kun uten aktive filtre på side 1. Ren CSS-
 * animasjon (server-komponent) i tråd med modulens keyframe-mønster.
 */
export function RecommendedRow({ jobs }: { jobs: RecommendedJob[] }) {
  if (jobs.length === 0) return null;
  return (
    <section aria-label="Anbefalt for deg" className="rounded-2xl bg-panel p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <FiStar size={11} aria-hidden />
          </span>
          Anbefalt for deg
        </h2>
        <span className="text-[11px] text-ink-muted">Basert på CV-en din</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {jobs.map((j, i) => {
          const tier = j.matchScore !== null ? matchTier(j.matchScore) : "lav";
          return (
            <Link
              key={j.id}
              href={`/jobb/${j.slug}`}
              prefetch
              scroll={false}
              style={{ animationDelay: `${i * 90}ms` }}
              className="group relative overflow-hidden rounded-xl border border-border bg-surface px-4 py-3 text-left outline-none transition-all hover:border-border-strong hover:shadow-[0_2px_10px_rgba(20,17,14,0.06)] focus-visible:ring-2 focus-visible:ring-accent/50 motion-safe:animate-[recommended-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
            >
              <span
                aria-hidden
                className={cn("absolute inset-y-0 left-0 w-[3px]", TIER_EDGE[tier])}
              />
              <span className="flex items-center justify-between gap-2">
                <MatchLabel score={j.matchScore} loggedIn />
                {j.applicationDueAt && (
                  <span className="text-[10.5px] tabular-nums text-ink-muted">
                    Frist {FRIST_FMT.format(j.applicationDueAt)}
                  </span>
                )}
              </span>
              {j.matchScore !== null && (
                <span
                  aria-hidden
                  className="mt-2 block h-[4px] overflow-hidden rounded-full bg-panel"
                >
                  <span
                    className="block h-full origin-left rounded-full bg-ink/70 motion-safe:animate-[match-bar-fill_0.7s_cubic-bezier(0.22,1,0.36,1)_both]"
                    style={{
                      width: `${tierWidth(j.matchScore)}%`,
                      animationDelay: `${150 + i * 90}ms`,
                    }}
                  />
                </span>
              )}
              <span className="mt-2 block truncate text-[13px] font-medium text-ink group-hover:text-accent-ink">
                {j.title}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
                {j.employerName}
                {j.kommune ? ` · ${j.kommune}` : ""}
              </span>
              {j.matchedKeywords.length > 0 && (
                <span className="mt-1.5 block truncate text-[10.5px] text-ink-faint">
                  Treffer: {j.matchedKeywords.join(", ")}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
