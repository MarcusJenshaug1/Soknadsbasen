"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

type JobAnalysis = {
  mustHave?: string[];
  niceToHave?: string[];
  responsibilities?: string[];
  redFlags?: string[];
  tone?: string;
  summary?: string;
};

type InterviewPrep = {
  questions?: {
    category: string;
    question: string;
    tip: string;
  }[];
};

type FollowUp = {
  subject?: string;
  body?: string;
  markdown?: string;
  contactEmail?: string | null;
};

type MatchScore = {
  score?: number;
  label?: string;
  styrker?: string[];
  mangler?: string[];
  anbefalinger?: string[];
};

type Panel = "analyze" | "interview" | "follow-up" | "match" | null;

export function AiTools({ applicationId }: { applicationId: string }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [interview, setInterview] = useState<InterviewPrep | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null);

  async function call(
    path: string,
    extra?: Record<string, unknown>,
  ): Promise<unknown> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, ...(extra ?? {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI-feil");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function runAnalyze() {
    setPanel("analyze");
    try {
      setAnalysis((await call("analyze-job")) as JobAnalysis);
    } catch {}
  }
  async function runInterview() {
    setPanel("interview");
    try {
      setInterview((await call("interview-prep")) as InterviewPrep);
    } catch {}
  }
  async function runFollowUp() {
    setPanel("follow-up");
    try {
      setFollowUp((await call("follow-up")) as FollowUp);
    } catch {}
  }
  async function runMatchScore() {
    setPanel("match");
    try {
      setMatchScore((await call("match-score")) as MatchScore);
    } catch {}
  }

  const btn =
    "w-full text-left px-3 py-2 rounded-xl text-[13px] hover:bg-panel/60 transition-colors flex items-center justify-between gap-2";

  return (
    <div className="space-y-2">
      <SectionLabel>AI-verktøy</SectionLabel>
      <div className="space-y-1">
        <button onClick={runMatchScore} className={btn}>
          <span>CV-match mot stillingen</span>
          <span className="text-[11px] text-accent">→</span>
        </button>
        <button onClick={runAnalyze} className={btn}>
          <span>Analyser stillingen</span>
          <span className="text-[11px] text-accent">→</span>
        </button>
        <button onClick={runInterview} className={btn}>
          <span>Intervjuforberedelse</span>
          <span className="text-[11px] text-accent">→</span>
        </button>
        <button onClick={runFollowUp} className={btn}>
          <span>Skriv oppfølgings-e-post</span>
          <span className="text-[11px] text-accent">→</span>
        </button>
      </div>

      {panel && (
        <div className="mt-3 rounded-2xl border border-black/8 dark:border-white/8 bg-bg p-4">
          {loading && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2 text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
                <span className="inline-flex gap-[3px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
                AI analyserer …
              </div>
              <div className="space-y-2 animate-pulse">
                <div className="h-2.5 bg-panel rounded-full w-3/4" />
                <div className="h-2.5 bg-panel rounded-full w-1/2" />
                <div className="h-2.5 bg-panel rounded-full w-2/3" />
                <div className="h-2.5 bg-panel rounded-full w-5/6" />
              </div>
            </div>
          )}
          {error && (
            <div className="py-4 text-[12px] text-accent">{error}</div>
          )}

          {panel === "analyze" && analysis && !loading && !error && (
            <AnalysisView a={analysis} />
          )}
          {panel === "interview" && interview && !loading && !error && (
            <InterviewView data={interview} />
          )}
          {panel === "follow-up" && followUp && !loading && !error && (
            <FollowUpView data={followUp} />
          )}
          {panel === "match" && matchScore && !loading && !error && (
            <MatchScoreView data={matchScore} />
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setPanel(null);
                setError(null);
              }}
              className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 hover:text-ink"
            >
              Lukk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchScoreView({ data }: { data: MatchScore }) {
  const score = data.score ?? 0;
  const color =
    score >= 80 ? "#16a34a" : score >= 60 ? "#D5592E" : score >= 40 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="text-[48px] leading-none tracking-[-0.04em] font-medium" style={{ color }}>
          {score}
        </div>
        <div className="pb-1">
          <div className="text-[11px] text-[#14110e]/55">/ 100</div>
          {data.label && (
            <div className="text-[12px] font-medium" style={{ color }}>
              {data.label}
            </div>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <Group title="Styrker" items={data.styrker} />
      <Group title="Mangler" items={data.mangler} accent />
      <Group title="Anbefalinger" items={data.anbefalinger} />
    </div>
  );
}

function Group({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[] | undefined;
  accent?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <div
        className={cn(
          "text-[10px] uppercase tracking-[0.2em] mb-1.5",
          accent ? "text-accent" : "text-[#14110e]/55 dark:text-[#f0ece6]/55",
        )}
      >
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-[12px] text-[#14110e]/80 dark:text-[#f0ece6]/80 leading-[1.5] flex gap-1.5">
            <span className="text-[#14110e]/30 dark:text-[#f0ece6]/30">·</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisView({ a }: { a: JobAnalysis }) {
  return (
    <div className="space-y-4">
      {a.summary && (
        <p className="text-[13px] text-[#14110e]/75 dark:text-[#f0ece6]/75 leading-[1.6]">{a.summary}</p>
      )}
      <Group title="Må ha" items={a.mustHave} accent />
      <Group title="Ønskelig" items={a.niceToHave} />
      <Group title="Hovedoppgaver" items={a.responsibilities} />
      <Group title="Varsellamper" items={a.redFlags} accent />
      {a.tone && (
        <div className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 pt-2 border-t border-black/5 dark:border-white/5">
          Tone i annonsen: <span className="text-[#14110e]/80 dark:text-[#f0ece6]/80">{a.tone}</span>
        </div>
      )}
    </div>
  );
}

function InterviewView({ data }: { data: InterviewPrep }) {
  if (!data.questions?.length) {
    return (
      <p className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55">Ingen spørsmål generert.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {data.questions.map((q, i) => (
        <li key={i}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
            {q.category}
          </div>
          <div className="text-[13px] text-ink font-medium leading-snug">
            {q.question}
          </div>
          {q.tip && (
            <div className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mt-1 italic">
              {q.tip}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function FollowUpView({ data }: { data: FollowUp }) {
  const [copied, setCopied] = useState(false);
  const plain = (data.markdown ?? "").trim();

  function copy() {
    const text = [
      data.subject ? `Emne: ${data.subject}` : "",
      "",
      plain,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {data.subject && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-1">
            Emne
          </div>
          <div className="text-[13px] font-medium">{data.subject}</div>
        </div>
      )}
      {data.body && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-1">
            Innhold
          </div>
          <div
            className="text-[13px] text-[#14110e]/85 dark:text-[#f0ece6]/85 leading-[1.6] [&_p]:mb-2 last:[&_p]:mb-0"
            dangerouslySetInnerHTML={{ __html: data.body }}
          />
        </div>
      )}
      <div className="flex gap-2 pt-2 border-t border-black/5 dark:border-white/5">
        <button
          onClick={copy}
          className="px-3 py-1.5 rounded-full bg-accent text-bg text-[11px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830]"
        >
          {copied ? "Kopiert" : "Kopier"}
        </button>
        {data.contactEmail && (
          <a
            href={`mailto:${data.contactEmail}?subject=${encodeURIComponent(data.subject ?? "")}&body=${encodeURIComponent(plain)}`}
            className="px-3 py-1.5 rounded-full border border-black/15 dark:border-white/15 text-[11px] hover:border-black/30 dark:hover:border-white/30"
          >
            Åpne i e-post
          </a>
        )}
      </div>
    </div>
  );
}
