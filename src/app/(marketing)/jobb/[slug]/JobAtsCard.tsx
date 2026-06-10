"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useResumeStore } from "@/store/useResumeStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { AtsScoreRing } from "@/components/ats/AtsScoreRing";
import { AtsChipRow } from "@/components/ats/AtsChipRow";
import {
  computeAiMatch,
  matchLocalKeywords,
  scoreTone,
  type AiMatchResult,
} from "@/components/ats/ats-display";

// CvTipsPanel lazy-loades — kun nødvendig når brukeren klikker "Få hjelp
// med CV". Sparer ~5 KB JS i initial detail-bundle.
const CvTipsPanel = dynamic(
  () => import("@/components/cv/CvTipsPanel").then((m) => m.CvTipsPanel),
  { ssr: false },
);

type Props = {
  slug: string;
  jobTitle: string;
  employerName: string;
  /** NAV-klassifisering, brukt som fallback hvis AI ikke gir resultat. */
  navKeywords: string[];
  /**
   * Server-pre-fetched AI-keywords. Når satt rendrer kortet score umiddelbart
   * uten klient-roundtrip. Klient re-fetcher kun hvis null (cache miss).
   */
  initialMatch?: {
    cvKeywords: string[];
    jobKeywords: string[];
  } | null;
};

export function JobAtsCard({
  slug,
  jobTitle,
  employerName,
  navKeywords,
  initialMatch,
}: Props) {
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

  // Hvis serveren leverte cached keywords, vis score umiddelbart.
  const initialResult = useMemo(() => {
    if (!initialMatch) return null;
    return computeAiMatch(initialMatch.cvKeywords, initialMatch.jobKeywords);
  }, [initialMatch]);

  const [result, setResult] = useState<AiMatchResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    if (!hasResume) {
      setResult(null);
      return;
    }
    // Cache hit fra server: hopp over klient-fetch.
    if (initialResult) {
      setResult(initialResult);
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

        const ai = computeAiMatch(cvKw, jobKw);
        if (ai) {
          setResult(ai);
        } else if (navKeywords.length > 0) {
          // Fallback til lokal NAV-match hvis AI ikke leverte
          const local = matchLocalKeywords(data, navKeywords);
          setResult({ ...local, source: "nav" });
        } else {
          setResult(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Hard error → fallback
        if (navKeywords.length > 0) {
          const local = matchLocalKeywords(data, navKeywords);
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
  }, [hasResume, slug, initialResult]);

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
          className="inline-flex min-h-9 items-center gap-1 rounded text-[12px] font-medium text-accent underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#D5592E]/50"
        >
          Åpne CV-bygger →
        </Link>
      </div>
    );
  }

  if (loading || !result) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-black/10 bg-white p-5 mb-6"
      >
        <div className="flex items-start gap-5">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2.5 w-24 mb-2.5" />
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-4/5 rounded-full" />
        </div>
        <span className="sr-only">AI sjekker match mot CV-en din</span>
      </div>
    );
  }

  const tone = scoreTone(result.score);
  const matched = result.matched.slice(0, 10);
  const missing = result.missing.slice(0, 8);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 mb-6">
      <div className="flex items-start gap-5">
        <AtsScoreRing score={result.score} color={tone.color} size={64} stroke={6} />
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
            <AtsChipRow
              label="Matchet"
              chips={matched}
              extraCount={result.matched.length - matched.length}
              variant="match"
              layout="inline"
            />
          )}
          {missing.length > 0 && (
            <AtsChipRow
              label="Mangler"
              chips={missing}
              extraCount={result.missing.length - missing.length}
              variant="missing"
              layout="inline"
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
          aria-haspopup="dialog"
          aria-expanded={tipsOpen}
          className="inline-flex min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink text-bg text-[12px] font-medium outline-none hover:bg-[#2a2520] focus-visible:ring-2 focus-visible:ring-[#D5592E]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
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
