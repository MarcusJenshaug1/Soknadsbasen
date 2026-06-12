"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, FileText, ArrowRight } from "lucide-react";
import { AiQuotaNotice, parseAiError, type AiError } from "@/components/ai/AiQuotaNotice";
import { useResumeStore, type ResumeData } from "@/store/useResumeStore";

/**
 * «Lag tilpasset CV» på søknadens Forberedelse-fane: dupliserer aktiv CV via
 * /api/ai/tailor-cv (AI omskriver profil, sorterer ferdigheter, løfter frem
 * relevant erfaring), legger den inn i CV-storen som egen navngitt CV
 * (persisteres av aktiv sync-stack) og kobler den til søknaden via
 * tailoredResumeId. Redigeres videre som en vanlig CV i Min CV.
 */
export function TailorCvCard({
  applicationId,
  tailoredResumeId,
  onLinked,
}: {
  applicationId: string;
  tailoredResumeId: string | null;
  onLinked: (resumeId: string | null) => void;
}) {
  const router = useRouter();
  const isLoaded = useResumeStore((s) => s.isLoaded);
  const resumes = useResumeStore((s) => s.resumes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<AiError | null>(null);

  const linked = tailoredResumeId
    ? (resumes.find((r) => r.id === tailoredResumeId) ?? null)
    : null;

  async function generate() {
    setBusy(true);
    setError(null);
    setQuotaError(null);
    let newId: string | null = null;
    const prevActiveId = useResumeStore.getState().activeResumeId;
    try {
      const res = await fetch("/api/ai/tailor-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
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
        | { name?: string; resumeData?: unknown }
        | null;
      if (!data?.name || !data.resumeData) {
        throw new Error("Ugyldig svar fra AI-tilpasningen. Prøv igjen.");
      }

      newId = useResumeStore
        .getState()
        .addResumeWithData(data.name, data.resumeData as ResumeData);

      const patchRes = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailoredResumeId: newId }),
      });
      if (!patchRes.ok) throw new Error(`HTTP ${patchRes.status}`);

      onLinked(newId);
    } catch (e) {
      // Koblingen feilet — fjern den nyopprettede CV-en så vi ikke etterlater
      // en løs kopi, og gjenopprett CV-en som var aktiv (removeResume faller
      // ellers tilbake til første i listen).
      if (newId) {
        const store = useResumeStore.getState();
        store.removeResume(newId);
        if (store.resumes.some((r) => r.id === prevActiveId)) {
          useResumeStore.getState().setActiveResume(prevActiveId);
        }
      }
      setError(
        e instanceof Error ? e.message : "Kunne ikke lage tilpasset CV. Prøv igjen.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openTailored() {
    if (!tailoredResumeId) return;
    useResumeStore.getState().setActiveResume(tailoredResumeId);
    router.push("/app/cv");
  }

  // Koblet, men CV-en er slettet (i editoren eller via Nullstill).
  const deleted = Boolean(tailoredResumeId && isLoaded && !linked);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FileText size={14} className="text-ink/50" />
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink/50 font-medium">
          Tilpasset CV
        </span>
      </div>

      {linked ? (
        <>
          <p className="text-[12px] text-ink/60 mb-3">
            «{linked.name}» er koblet til denne søknaden og satt som aktiv CV.
            Den kan redigeres videre i Min CV.
          </p>
          <button
            type="button"
            onClick={openTailored}
            className="inline-flex items-center justify-center gap-1.5 w-full px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover transition-colors"
          >
            Åpne tilpasset CV
            <ArrowRight size={14} />
          </button>
        </>
      ) : (
        <>
          <p className="text-[12px] text-ink/60 mb-3">
            {deleted
              ? "Den tilpassede CV-en er slettet. Lag en ny fra aktiv CV."
              : "AI dupliserer aktiv CV og spisser profil, ferdigheter og erfaring mot stillingsteksten."}
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={busy || !isLoaded}
            className="inline-flex items-center justify-center gap-1.5 w-full px-5 py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            <Sparkles size={14} />
            {busy
              ? "Skreddersyr … (tar 10–20 sek)"
              : deleted
                ? "Lag ny tilpasset CV"
                : "Lag tilpasset CV"}
          </button>
        </>
      )}

      {quotaError && (
        <div className="mt-3">
          <AiQuotaNotice error={quotaError} />
        </div>
      )}
      {error && !quotaError && (
        <p className="text-[12px] text-accent mt-3" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
