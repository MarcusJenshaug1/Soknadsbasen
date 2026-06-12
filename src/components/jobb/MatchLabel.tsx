import Link from "next/link";

import { matchTier } from "@/lib/jobs/match";
import { cn } from "@/lib/cn";

const TIER_STYLES = {
  hoy: { label: "Høy match", className: "bg-success-soft text-success-ink" },
  middels: { label: "Middels match", className: "bg-accent-soft text-accent-ink" },
  lav: { label: "Lav match", className: "bg-panel text-ink-soft" },
} as const;

/**
 * Match-pill (designreferansen): Høy/Middels/Lav med score-tall, tallet
 * skjules i kompakt tetthet via data-density på DensityProvider-wrapperen.
 * Anonyme får dashed teaser-lenke til CV-opplasting. score=null hos
 * innloggede (ikke beregnet ennå) viser ingenting.
 */
export function MatchLabel({
  score,
  loggedIn,
}: {
  score: number | null;
  loggedIn: boolean;
}) {
  if (!loggedIn) {
    return (
      <Link
        href="/registrer"
        className="inline-flex h-[24px] items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 text-[10.5px] font-medium text-ink-muted transition-colors hover:border-ink hover:text-ink"
      >
        Last opp CV for å se match
      </Link>
    );
  }
  if (score === null) return null;

  const tier = TIER_STYLES[matchTier(score)];
  return (
    <span
      className={cn(
        "inline-flex h-[24px] items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-semibold",
        tier.className,
      )}
    >
      {tier.label}
      <span className="font-medium tabular-nums opacity-70 group-data-[density=kompakt]/density:hidden">
        {score}
      </span>
    </span>
  );
}
