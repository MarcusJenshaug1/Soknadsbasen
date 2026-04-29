"use client";

import { useState } from "react";
import { Check, Minus, X, Sparkles } from "lucide-react";
import type { MatchScoreResult, RequirementStatus } from "@/lib/match-score";

type Props = {
  applicationId: string;
};

export function MatchScoreDisplay({ applicationId }: Props) {
  const [result, setResult] = useState<MatchScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compute() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke beregne match");
      setResult(data as MatchScoreResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  if (!result && !loading && !error) {
    return (
      <button
        type="button"
        onClick={compute}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] transition-colors"
      >
        <Sparkles className="size-4" />
        Beregn Match Score (gratis)
      </button>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="flex items-center gap-3 text-[13px] text-[#14110e]/70">
          <div className="size-4 rounded-full border-2 border-[#D5592E] border-t-transparent animate-spin" />
          Analyserer krav og sammenligner med CV...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-900">
        <div className="font-medium mb-1">Kunne ikke beregne Match Score</div>
        <div className="text-amber-900/80">{error}</div>
        <button
          type="button"
          onClick={compute}
          className="mt-2 text-[12px] underline underline-offset-2 hover:no-underline"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 mb-6">
        <ScoreRing score={result.score} />
        <div className="flex-1">
          <h3 className="text-[18px] font-medium tracking-tight mb-1">
            Du dekker {result.coveredCount} av {result.totalRequirements} krav
          </h3>
          <p className="text-[13px] text-[#14110e]/65 mb-3">
            {result.summary.mustCovered} av {result.summary.mustTotal} må-krav
            dekket
            {result.summary.niceTotal > 0 ? (
              <>
                , {result.summary.niceCovered} av {result.summary.niceTotal}{" "}
                bonus-krav
              </>
            ) : null}
            .
          </p>
          <div className="flex gap-3 text-[12px]">
            <Stat color="emerald" label="Dekket" count={result.coveredCount} />
            <Stat color="amber" label="Delvis" count={result.partialCount} />
            <Stat color="black" label="Mangler" count={result.gapCount} />
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {result.matches.map((m, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[13px] py-1.5 border-b border-black/5 last:border-b-0"
          >
            <StatusIcon status={m.status} />
            <div className="flex-1">
              <span className="text-[#14110e]/85">{m.requirement}</span>
              {m.category === "nice" && (
                <span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-[#14110e]/40">
                  bonus
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {result.gapCount > 0 && (
        <p className="mt-5 pt-4 border-t border-black/10 text-[12px] text-[#14110e]/60 leading-[1.6]">
          Tips: AI-en lager bedre brev hvis du fyller ut CV-en med eksempler som
          treffer manglende krav, eller redigerer brevet for å snu fokus mot
          dine sterkeste sider.
        </p>
      )}

      <button
        type="button"
        onClick={compute}
        className="mt-4 text-[12px] text-[#14110e]/55 hover:text-[#14110e] underline underline-offset-2"
      >
        Beregn på nytt
      </button>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color =
    score >= 75 ? "#059669" : score >= 50 ? "#D97706" : "#9F1239";
  return (
    <div className="relative size-[100px] shrink-0">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-medium tracking-tight" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#14110e]/55">
          score
        </span>
      </div>
    </div>
  );
}

function Stat({
  color,
  label,
  count,
}: {
  color: "emerald" | "amber" | "black";
  label: string;
  count: number;
}) {
  const dot =
    color === "emerald"
      ? "bg-emerald-500"
      : color === "amber"
        ? "bg-amber-500"
        : "bg-[#14110e]/30";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className="text-[#14110e]/70">
        {label}: {count}
      </span>
    </span>
  );
}

function StatusIcon({ status }: { status: RequirementStatus }) {
  if (status === "covered") {
    return (
      <span className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
        <Check className="size-3 text-emerald-700" />
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
        <Minus className="size-3 text-amber-700" />
      </span>
    );
  }
  return (
    <span className="size-5 rounded-full bg-black/5 flex items-center justify-center shrink-0 mt-0.5">
      <X className="size-3 text-[#14110e]/50" />
    </span>
  );
}
