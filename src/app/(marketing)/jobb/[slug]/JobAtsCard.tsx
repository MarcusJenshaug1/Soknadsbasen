"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useResumeStore } from "@/store/useResumeStore";
import { cn } from "@/lib/cn";
import { CvTipsPanel } from "./CvTipsPanel";

type Props = {
  slug: string;
  jobTitle: string;
  employerName: string;
  /** NAV-klassifisering, brukt som fallback hvis AI ikke gir resultat. */
  navKeywords: string[];
};

type MatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  source: "ai" | "nav";
};

export function JobAtsCard({ slug, jobTitle, employerName, navKeywords }: Props) {
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

  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    if (!hasResume) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch("/api/ai/cv-keywords", { method: "POST" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/ai/job-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cv, job]) => {
        if (cancelled) return;
        const cvKw: string[] = cv?.keywords ?? [];
        const jobKw: string[] = job?.keywords ?? [];

        if (cvKw.length === 0 || jobKw.length === 0) {
          // Fallback til lokal NAV-match hvis AI ikke leverte
          if (navKeywords.length > 0) {
            const local = matchKeywords(buildResumeText(data), navKeywords);
            setResult({ ...local, source: "nav" });
          } else {
            setResult(null);
          }
          setLoading(false);
          return;
        }

        // AI-match: intersect cvKw og jobKw (case-insensitive)
        const cvLower = new Set(cvKw.map((k) => k.toLowerCase()));
        const matched = jobKw.filter((k) => cvLower.has(k.toLowerCase()));
        const missing = jobKw.filter((k) => !cvLower.has(k.toLowerCase()));
        const coverage = jobKw.length > 0 ? matched.length / jobKw.length : 0;
        const score = Math.round(coverage * 100);

        setResult({ score, matched, missing, source: "ai" });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Hard error → fallback
        if (navKeywords.length > 0) {
          const local = matchKeywords(buildResumeText(data), navKeywords);
          setResult({ ...local, source: "nav" });
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // data brukes inni handler men trenger ikke trigge re-fetch ved hver
    // tastetrykk i resume — slug er den ekte trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResume, slug]);

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

  if (loading || !result) {
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
        <span className="text-[12px] text-[#14110e]/65">
          AI sjekker match mot CV-en din …
        </span>
      </div>
    );
  }

  const tone = scoreTone(result.score);
  const matched = result.matched.slice(0, 10);
  const missing = result.missing.slice(0, 8);

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
              {result.source === "ai" ? "AI-analyse" : "NAV-klassifisering"}
            </span>
          </div>
          <h3 className="text-[15px] font-medium tracking-tight mb-1">
            ATS-match mot CV-en din
          </h3>
          <p className="text-[12px] text-[#14110e]/65 leading-[1.5]">
            {result.matched.length} av{" "}
            {result.matched.length + result.missing.length || 1} nøkkelord
            matcher.
          </p>
        </div>
      </div>

      {(matched.length > 0 || missing.length > 0) && (
        <div className="mt-4 space-y-2.5">
          {matched.length > 0 && (
            <ChipRow
              label="Matchet"
              chips={matched}
              extraCount={result.matched.length - matched.length}
              variant="match"
            />
          )}
          {missing.length > 0 && (
            <ChipRow
              label="Mangler"
              chips={missing}
              extraCount={result.missing.length - missing.length}
              variant="missing"
            />
          )}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-black/5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-[#14110e]/55">
          Vil du forbedre matchen mot denne stillingen?
        </span>
        <button
          type="button"
          onClick={() => setTipsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink text-bg text-[12px] font-medium hover:bg-[#2a2520] transition-colors"
        >
          <SparkleIcon />
          Få hjelp med CV
        </button>
      </div>

      {tipsOpen && (
        <CvTipsPanel
          slug={slug}
          jobTitle={jobTitle}
          employerName={employerName}
          onClose={() => setTipsOpen(false)}
        />
      )}
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

function buildResumeText(data: {
  role?: string;
  summary?: string;
  skills?: string[];
  experience?: { title: string; company: string; description?: string }[];
}): string {
  return [
    data.role ?? "",
    data.summary ?? "",
    (data.skills ?? []).join(" "),
    (data.experience ?? [])
      .map((e) => `${e.title} ${e.company} ${e.description ?? ""}`)
      .join(" "),
  ].join(" ");
}

function matchKeywords(resumeText: string, keywords: string[]) {
  const normalized = resumeText
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    const norm = k
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "");
    if (normalized.includes(norm)) matched.push(k);
    else missing.push(k);
  }
  const total = keywords.length || 1;
  const score = Math.round((matched.length / total) * 100);
  return { score, matched, missing };
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
