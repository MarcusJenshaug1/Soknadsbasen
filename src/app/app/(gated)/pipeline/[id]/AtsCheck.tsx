"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useResumeStore } from "@/store/useResumeStore";
import {
  analyzeAtsMatch,
  analyzeAtsWithKeywords,
  type AtsAnalysis,
} from "@/lib/ats";
import { SectionLabel } from "@/components/ui/Pill";
import { IconArrowRight, IconCheck, IconPlus } from "@/components/ui/Icons";
import { AtsScoreRing } from "@/components/ats/AtsScoreRing";
import { AtsChipRow } from "@/components/ats/AtsChipRow";
import { scoreTone } from "@/components/ats/ats-display";
import { cn } from "@/lib/cn";

// Lazy: CvTipsPanel henter AI-tips på modal-åpning, ikke ved kort-render.
// Samme mønster som JobAtsCard på /jobb/[slug].
const CvTipsPanel = dynamic(
  () => import("@/components/cv/CvTipsPanel").then((m) => m.CvTipsPanel),
  { ssr: false },
);

type Props = {
  applicationId: string;
  jobTitle: string;
  companyName: string;
  jobUrl: string | null;
  jobDescription: string | null;
  onJobDescriptionUpdate: (next: string) => void;
};

type Status =
  | "idle"
  | "fetching-url"
  | "extracting-keywords"
  | "analyzing"
  | "done"
  | "error";

type ResultMeta = { source: "ai" | "local" };

export function AtsCheck({
  applicationId,
  jobTitle,
  companyName,
  jobUrl,
  jobDescription,
  onJobDescriptionUpdate,
}: Props) {
  const data = useResumeStore((s) => s.data);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsAnalysis | null>(null);
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);

  const hasJobUrl = Boolean(jobUrl?.trim());
  const hasJobText = Boolean(jobDescription?.trim());
  const hasResume = useMemo(() => {
    if (!activeResumeId) return false;
    if (data.role?.trim()) return true;
    if (data.summary?.trim()) return true;
    if (data.skills.length > 0) return true;
    if (data.experience.length > 0) return true;
    return false;
  }, [activeResumeId, data]);

  const canRun = hasResume && (hasJobText || hasJobUrl);

  async function fetchJobText(): Promise<string | null> {
    const url = jobUrl?.trim();
    if (!url) return null;
    setStatus("fetching-url");
    const res = await fetch("/api/ai/parse-job-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error ?? "Kunne ikke hente stillingsteksten");
    }
    const payload = (await res.json()) as { jobDescription?: string | null };
    const text = payload.jobDescription?.trim() ?? "";
    if (!text) throw new Error("Fant ingen stillingstekst på siden");

    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: text }),
    });
    onJobDescriptionUpdate(text);
    return text;
  }

  async function fetchAiKeywords(): Promise<{
    keywords: string[];
    suggestedRole: string | null;
  } | null> {
    setStatus("extracting-keywords");
    try {
      const res = await fetch("/api/ai/ats-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      if (!res.ok) return null;
      const payload = (await res.json()) as {
        keywords?: string[];
        suggestedRole?: string | null;
      };
      const keywords = Array.isArray(payload.keywords) ? payload.keywords : [];
      if (keywords.length === 0) return null;
      return {
        keywords,
        suggestedRole: payload.suggestedRole ?? null,
      };
    } catch {
      return null;
    }
  }

  async function run() {
    setError(null);
    setResult(null);
    setResultMeta(null);
    try {
      let text = jobDescription?.trim() ?? "";
      if (!text) {
        const fetched = await fetchJobText();
        if (!fetched) throw new Error("Mangler stillingstekst");
        text = fetched;
      }
      const ai = await fetchAiKeywords();
      setStatus("analyzing");
      await new Promise((r) => setTimeout(r, 200));
      if (ai) {
        const analysis = analyzeAtsWithKeywords(data, ai.keywords, {
          jobAd: text,
          suggestedRole: ai.suggestedRole,
        });
        setResult(analysis);
        setResultMeta({ source: "ai" });
      } else {
        const analysis = analyzeAtsMatch(data, text);
        setResult(analysis);
        setResultMeta({ source: "local" });
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setStatus("error");
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AtsIcon />
          <SectionLabel>ATS-sjekk</SectionLabel>
        </div>
        {result && (
          <button
            type="button"
            onClick={run}
            className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 hover:text-ink"
          >
            Kjør på nytt
          </button>
        )}
      </div>

      {status === "idle" && !result && (
        <IdleState
          canRun={canRun}
          hasResume={hasResume}
          hasJobText={hasJobText}
          hasJobUrl={hasJobUrl}
          onRun={run}
        />
      )}

      {(status === "fetching-url" ||
        status === "extracting-keywords" ||
        status === "analyzing") && (
        <LoadingState
          label={
            status === "fetching-url"
              ? "Henter stillingstekst fra URL …"
              : status === "extracting-keywords"
                ? "AI finner ATS-nøkkelord …"
                : "Sjekker match mot CV-en …"
          }
        />
      )}

      {status === "error" && error && (
        <div className="space-y-3">
          <div className="rounded-xl bg-accent/10 border border-accent/30 px-3 py-2.5 text-[12px] text-accent">
            {error}
          </div>
          <button
            type="button"
            onClick={run}
            className="text-[12px] text-[#14110e]/65 dark:text-[#f0ece6]/65 hover:text-ink underline underline-offset-2"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {status === "done" && result && (
        <ResultView
          analysis={result}
          currentTemplateId={data.templateId}
          source={resultMeta?.source ?? "local"}
          onOpenTips={() => setTipsOpen(true)}
        />
      )}

      {tipsOpen && (
        <CvTipsPanel
          applicationId={applicationId}
          jobTitle={jobTitle}
          employerName={companyName}
          onClose={() => setTipsOpen(false)}
        />
      )}
    </div>
  );
}

function IdleState({
  canRun,
  hasResume,
  hasJobText,
  hasJobUrl,
  onRun,
}: {
  canRun: boolean;
  hasResume: boolean;
  hasJobText: boolean;
  hasJobUrl: boolean;
  onRun: () => void;
}) {
  const help = !hasResume
    ? "Fyll inn CV-en din først for å kunne kjøre ATS-sjekk."
    : !hasJobText && !hasJobUrl
      ? "Lim inn stillings-URL eller jobbeskrivelsen for å sjekke match."
      : !hasJobText && hasJobUrl
        ? "Vi henter stillingsteksten fra URL-en og sjekker hvilke nøkkelord CV-en din dekker."
        : "Vi sjekker hvilke nøkkelord fra annonsen som finnes i CV-en din.";

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#14110e]/70 dark:text-[#f0ece6]/70 leading-[1.55]">
        Sjekk hvor godt CV-en matcher stillingen, basert på nøkkelord, rolle og
        ATS-vennlig mal.
      </p>
      <p className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 leading-[1.55]">
        {help}
      </p>
      <button
        type="button"
        onClick={onRun}
        disabled={!canRun}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium transition-colors",
          "bg-accent text-bg hover:bg-[#a94424] dark:hover:bg-[#c45830]",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        Kjør ATS-sjekk
        <IconArrowRight size={14} />
      </button>
      {!hasJobText && hasJobUrl && (
        <div className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-accent" />
          Stillings-URL er lagt inn, vi henter teksten automatisk
        </div>
      )}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2 text-[12px] text-[#14110e]/65 dark:text-[#f0ece6]/65">
        <span className="inline-flex gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
        {label}
      </div>
      <div className="space-y-2 animate-pulse">
        <div className="h-2.5 bg-panel rounded-full w-3/4" />
        <div className="h-2.5 bg-panel rounded-full w-1/2" />
        <div className="h-2.5 bg-panel rounded-full w-2/3" />
      </div>
    </div>
  );
}

function ResultView({
  analysis,
  currentTemplateId,
  source,
  onOpenTips,
}: {
  analysis: AtsAnalysis;
  currentTemplateId: string;
  source: "ai" | "local";
  onOpenTips: () => void;
}) {
  const { score, matchedKeywords, missingKeywords, summary, recommendedTemplateId } =
    analysis;
  const tone = scoreTone(score);
  const showTemplateHint =
    recommendedTemplateId && !currentTemplateId.startsWith("ats-");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <AtsScoreRing score={score} color={tone.color} size={88} stroke={8} showOutOf />
        <div className="min-w-0">
          <div
            className="text-[11px] uppercase tracking-[0.2em]"
            style={{ color: tone.color }}
          >
            {tone.label}
          </div>
          <div className="text-[13px] text-[#14110e]/75 dark:text-[#f0ece6]/75 mt-1 leading-[1.5]">
            CV-en din matcher {matchedKeywords.length} av{" "}
            {matchedKeywords.length + missingKeywords.length || 1} nøkkelord fra
            annonsen.
          </div>
        </div>
      </div>

      {matchedKeywords.length > 0 && (
        <AtsChipRow
          label="Matchet"
          icon={<IconCheck size={11} className="text-emerald-700 dark:text-emerald-400" />}
          chips={matchedKeywords}
          collapsedLimit={12}
          variant="match"
        />
      )}

      {missingKeywords.length > 0 && (
        <AtsChipRow
          label="Mangler"
          icon={<IconPlus size={11} className="text-accent" />}
          chips={missingKeywords}
          collapsedLimit={8}
          variant="missing"
        />
      )}

      {summary.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {summary.map((line, i) => (
            <li
              key={i}
              className="text-[12px] text-[#14110e]/75 dark:text-[#f0ece6]/75 leading-[1.55] flex gap-2"
            >
              <span className="text-[#14110e]/30 dark:text-[#f0ece6]/30">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {showTemplateHint && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/70 dark:border-emerald-800/40 px-3 py-2.5 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            Tips
          </span>
          <span className="text-[12px] text-[#14110e]/80 dark:text-[#f0ece6]/85">
            Bytt til mal{" "}
            <span className="font-medium">ATS Clean</span> for bedre lesbarhet i
            rekrutteringssystemer.
          </span>
        </div>
      )}

      <div className="pt-3 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
          Vil du forbedre matchen mot denne stillingen?
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTips}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink text-bg text-[12px] font-medium hover:bg-[#2a2520] transition-colors"
          >
            <SparkleIcon />
            Få hjelp med CV
          </button>
          <Link
            href="/app/cv"
            className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline underline-offset-2"
          >
            Åpne CV
            <IconArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="-mt-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#14110e]/45 dark:text-[#f0ece6]/45">
          {source === "ai" ? "AI-nøkkelord, lokal match" : "Lokal analyse, ingen AI"}
        </span>
      </div>
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

function AtsIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="18" cy="16" r="3" />
      <path d="m20.5 18.5 1.5 1.5" />
    </svg>
  );
}
