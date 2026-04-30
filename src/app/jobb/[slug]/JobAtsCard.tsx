"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useResumeStore } from "@/store/useResumeStore";
import { analyzeAtsWithKeywords, type AtsAnalysis } from "@/lib/ats";
import { cn } from "@/lib/cn";

type Props = {
  jobDescription: string;
  /** NAV-klassifisering: ESCO/JANZZ/STYRK navn fra categoryList/occupationList. */
  keywords: string[];
};

export function JobAtsCard({ jobDescription, keywords }: Props) {
  const data = useResumeStore((s) => s.data);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);

  const hasResume = useMemo(() => {
    if (!activeResumeId) return false;
    if (data.role?.trim()) return true;
    if (data.summary?.trim()) return true;
    if (data.skills.length > 0) return true;
    if (data.experience.length > 0) return true;
    return false;
  }, [activeResumeId, data]);

  const [result, setResult] = useState<AtsAnalysis | null>(null);

  useEffect(() => {
    if (!hasResume || keywords.length === 0) {
      setResult(null);
      return;
    }
    setResult(
      analyzeAtsWithKeywords(data, keywords, { jobAd: jobDescription }),
    );
  }, [hasResume, keywords, data, jobDescription]);

  if (!hasResume) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-5 mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/55 mb-2">
          ATS-match
        </div>
        <p className="text-[13px] text-[#14110e]/70 leading-[1.55] mb-3">
          Fyll inn CV-en din så viser vi hvor godt du matcher denne stillingen,
          gratis og uten å lagre noe.
        </p>
        <Link
          href="/app/cv"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline underline-offset-2"
        >
          Åpne CV-bygger →
        </Link>
      </div>
    );
  }

  if (!result) {
    // Ingen NAV-keywords (gammel pre-backfill-rad). Skjul kortet, alternativet
    // ville være å vise loading evig.
    if (keywords.length === 0) return null;
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-5 mb-6 flex items-center gap-3">
        <span className="inline-flex gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
        <span className="text-[12px] text-[#14110e]/65">Sjekker match …</span>
      </div>
    );
  }

  const tone = scoreTone(result.score);
  const matched = result.matchedKeywords.slice(0, 8);
  const missing = result.missingKeywords.slice(0, 6);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 mb-6">
      <div className="flex items-start gap-5">
        <ScoreRing score={result.score} color={tone.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: tone.color }}
            >
              {tone.label}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#14110e]/45">
              NAV-klassifisering
            </span>
          </div>
          <h3 className="text-[15px] font-medium tracking-tight mb-1">
            ATS-match mot CV-en din
          </h3>
          <p className="text-[12px] text-[#14110e]/65 leading-[1.5]">
            {result.matchedKeywords.length} av{" "}
            {result.matchedKeywords.length + result.missingKeywords.length || 1}{" "}
            nøkkelord matcher.
          </p>
        </div>
      </div>

      {(matched.length > 0 || missing.length > 0) && (
        <div className="mt-4 space-y-2.5">
          {matched.length > 0 && (
            <ChipRow
              label="Matchet"
              chips={matched}
              extraCount={result.matchedKeywords.length - matched.length}
              variant="match"
            />
          )}
          {missing.length > 0 && (
            <ChipRow
              label="Mangler"
              chips={missing}
              extraCount={result.missingKeywords.length - missing.length}
              variant="missing"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ChipRow({
  label,
  chips,
  extraCount,
  variant,
}: {
  label: string;
  chips: string[];
  extraCount: number;
  variant: "match" | "missing";
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#14110e]/55 shrink-0">
        {label}
      </span>
      {chips.map((kw) => (
        <span
          key={kw}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]",
            variant === "match"
              ? "bg-emerald-100/70 text-emerald-800"
              : "bg-accent/10 text-accent",
          )}
        >
          {variant === "missing" && <span className="opacity-60">+</span>}
          {kw}
        </span>
      ))}
      {extraCount > 0 && (
        <span className="text-[11px] text-[#14110e]/50">+{extraCount}</span>
      )}
    </div>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`ATS-score ${score} av 100`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-black/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[20px] leading-none font-medium tracking-[-0.03em]"
          style={{ color }}
        >
          {clamped}
        </span>
      </div>
    </div>
  );
}

function scoreTone(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Sterk match", color: "#16a34a" };
  if (score >= 60) return { label: "God match", color: "#D5592E" };
  if (score >= 40) return { label: "Delvis match", color: "#f59e0b" };
  return { label: "Lav match", color: "#dc2626" };
}
