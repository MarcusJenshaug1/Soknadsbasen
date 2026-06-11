import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import type { CvStatus } from "@/lib/jobs/cv-status";
import { MATCH_THRESHOLDS } from "@/lib/jobs/match";

/** Anonym-banner (designreferansen): ink-bakgrunn med CV-CTA. */
export function AnonCvBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-bg">
      <div>
        <p className="text-[13.5px] font-medium">
          Se hvilke stillinger som matcher deg
        </p>
        <p className="mt-0.5 text-[12px] opacity-65">
          Last opp CV-en din, så sorterer vi listen etter beste match.
        </p>
      </div>
      <Link
        href="/registrer"
        className="flex h-[34px] shrink-0 items-center rounded-full bg-bg px-4 text-[12px] font-medium text-ink outline-none transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        Last opp CV
      </Link>
    </div>
  );
}

/**
 * CV-status for innloggede: banner når CV mangler, ellers kompletthet-
 * indikator + diskret «Forbedre CV-en»-hint når snittmatchen er lav.
 * Vises over filtrene i sidebar-kolonnen.
 */
export function CvStatusCard({ status }: { status: CvStatus }) {
  if (!status.hasCv) {
    return (
      <div className="mb-4 rounded-2xl bg-ink px-5 py-4 text-bg">
        <p className="text-[13.5px] font-medium">CV-en din er ikke på plass ennå</p>
        <p className="mt-0.5 text-[12px] opacity-65">
          Med CV i Søknadsbasen får du match-score på hver stilling.
        </p>
        <Link
          href="/app/cv"
          className="mt-3 inline-flex h-[32px] items-center gap-1.5 rounded-full bg-bg px-4 text-[12px] font-medium text-ink outline-none transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Fyll ut CV-en <FiArrowRight size={12} aria-hidden />
        </Link>
      </div>
    );
  }

  const lowMatch =
    status.avgTopMatch !== null && status.avgTopMatch < MATCH_THRESHOLDS.middels;
  if (status.completeness >= 100 && !lowMatch) return null;

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
          CV-en din
        </p>
        <span className="text-[11.5px] tabular-nums text-ink-muted">
          {status.completeness} % komplett
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={status.completeness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="CV-kompletthet"
        className="mt-2 h-[5px] overflow-hidden rounded-full bg-panel"
      >
        <div
          className="h-full rounded-full bg-success-ink"
          style={{ width: `${status.completeness}%` }}
        />
      </div>
      {(status.completeness < 100 || lowMatch) && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
          {lowMatch
            ? "Matchene dine er gjennomgående lave. En fyldigere CV gir bedre treff."
            : "En mer komplett CV gir mer presise matcher."}{" "}
          <Link
            href="/app/cv"
            className="text-accent-ink underline-offset-2 hover:underline"
          >
            Forbedre CV-en
          </Link>
        </p>
      )}
    </div>
  );
}
