import type { MatchBreakdown } from "@/lib/jobs/match-breakdown";

import { MatchLabel } from "../MatchLabel";

/**
 * «Din match»-seksjonen (designreferansen): faktor-barer med tekstord
 * (Sterk/Delvis/Svak — aldri kun farge/bredde) og forklaring på hva som
 * trakk opp/ned. Faktorene beregnes reelt i lib/jobs/match-breakdown.ts.
 */
export function MatchBreakdownCard({ breakdown }: { breakdown: MatchBreakdown }) {
  return (
    <section aria-label="Hvorfor denne matchen">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
          Din match
        </h3>
        <MatchLabel score={breakdown.score} loggedIn />
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
        {breakdown.factors.map((f) => (
          <div key={f.label}>
            <div className="flex items-baseline justify-between text-[11.5px]">
              <span className="font-medium text-ink">{f.label}</span>
              <span className="text-ink-muted">{f.word}</span>
            </div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-panel">
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${f.value}%`, opacity: 0.25 + f.value / 140 }}
              />
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-muted">
              {f.detail}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-muted">
        Beregnet fra CV-en din mot kravene i annonsen. Oppdater CV-en for å forbedre
        matchen.
      </p>
    </section>
  );
}
