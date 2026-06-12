"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { AiQuotaNotice, parseAiError, type AiError } from "@/components/ai/AiQuotaNotice";
import { SuggestionCard } from "@/components/collab/SuggestionCard";
import { applyResumeSuggestion } from "@/lib/cv-suggestions";
import { useResumeStore } from "@/store/useResumeStore";

/**
 * AI CV-hjelperen (siste steg i Min CV): én AI-gjennomgang av hele CV-en som
 * produserer felt-nivå-forslag i samme kort-UI som collab-forslag. Godkjente
 * forslag anvendes via de vanlige store-actionene og persisterer gjennom
 * aktiv sync-stack. Forslagene er efemære — lukk/refresh, og en ny
 * gjennomgang er ett nytt (rate-limitet) kall.
 */

type AiSuggestion = {
  id: string;
  fieldPath: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
};

export function AiReviewPanel() {
  const activeResumeId = useResumeStore((s) => s.activeResumeId);
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<AiError | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);

  async function runReview() {
    setLoading(true);
    setError(null);
    setQuotaError(null);
    setSuggestions(null);
    setAcceptedCount(0);
    try {
      const res = await fetch("/api/ai/cv-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: activeResumeId }),
      });
      if (!res.ok) {
        const aiErr = await parseAiError(res);
        if (aiErr.code) {
          setQuotaError(aiErr);
          return;
        }
        throw new Error(aiErr.message);
      }
      const data = (await res.json().catch(() => null)) as
        | { suggestions?: AiSuggestion[] }
        | null;
      setSuggestions(data?.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI-gjennomgangen feilet. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  function accept(s: AiSuggestion) {
    const applied = applyResumeSuggestion(s.fieldPath, s.suggestedValue);
    if (!applied) {
      setError(
        "Feltet finnes ikke lenger i CV-en, så forslaget kan ikke brukes. Avslå det for å rydde opp.",
      );
      return;
    }
    setError(null);
    setAcceptedCount((n) => n + 1);
    setSuggestions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
  }

  function reject(s: AiSuggestion) {
    setSuggestions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-medium text-ink mb-1">AI-hjelper</h2>
        <p className="text-[12.5px] text-ink/60 leading-relaxed">
          AI-en går gjennom alle feltene i CV-en og foreslår forbedringer du
          godtar eller avslår ett og ett, akkurat som forslag fra en invitert
          hjelper. Den finner aldri på innhold, den strammer opp det som
          allerede står der.
        </p>
      </div>

      {suggestions === null && (
        <button
          type="button"
          onClick={runReview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <Sparkles size={14} />
          {loading ? "Gjennomgår CV-en … (tar 10–20 sek)" : "Start AI-gjennomgang"}
        </button>
      )}

      {quotaError && <AiQuotaNotice error={quotaError} />}
      {error && !quotaError && (
        <p className="text-[12px] text-accent" role="alert">
          {error}
        </p>
      )}

      {suggestions !== null && suggestions.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-black/8 dark:border-white/8 bg-surface px-4 py-3.5">
          <CheckCircle2 size={16} className="text-ink/50 shrink-0" />
          <p className="text-[13px] text-ink/70">
            {acceptedCount > 0
              ? `Ferdig! ${acceptedCount} forslag er lagt inn i CV-en.`
              : "Ingen forslag, CV-en ser allerede solid ut."}
          </p>
          <button
            type="button"
            onClick={runReview}
            disabled={loading}
            className="ml-auto shrink-0 text-[12px] text-ink/50 hover:text-ink transition-colors disabled:opacity-50"
          >
            Kjør på nytt
          </button>
        </div>
      )}

      {suggestions !== null && suggestions.length > 0 && (
        <>
          <p className="text-[12px] text-ink/50" aria-live="polite">
            {suggestions.length} forslag igjen
            {acceptedCount > 0 ? `, ${acceptedCount} godtatt` : ""}
          </p>
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                fieldPath={s.fieldPath}
                beforeValue={s.currentValue}
                afterValue={s.suggestedValue}
                authorLabel="AI-hjelperen foreslår"
                reason={s.reason}
                busy={false}
                onAccept={() => accept(s)}
                onReject={() => reject(s)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
