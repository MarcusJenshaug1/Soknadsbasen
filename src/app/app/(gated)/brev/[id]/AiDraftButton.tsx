"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "varm" | "formell" | "konsis";

const TONES: { id: Tone; label: string }[] = [
  { id: "varm", label: "Varm" },
  { id: "formell", label: "Formell" },
  { id: "konsis", label: "Konsis" },
];

export type AiLetterMeta = {
  senderName: string | null;
  senderEmail: string | null;
  senderPhone: string | null;
  senderLocation: string | null;
  recipientName: string | null;
  recipientTitle: string | null;
  companyAddress: string | null;
};

/**
 * Generates an AI draft for the cover letter body via /api/ai/cover-letter.
 * Callers receive the HTML and swap it into the Lexical editor (via key-remount).
 */
export function AiDraftButton({
  applicationId,
  letter,
  onDraft,
}: {
  applicationId: string;
  letter: AiLetterMeta;
  onDraft: (html: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<Tone>("varm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, tone, letter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke hente utkast");
      onDraft(data.body);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[11px] font-medium hover:bg-[#a94424] transition-colors"
      >
        <Spark />
        Skriv utkast med AI
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <div className="inline-flex bg-[#eee9df] rounded-full p-1">
        {TONES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTone(t.id)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] transition-colors",
              tone === t.id
                ? "bg-[#faf8f5] text-[#14110e] font-medium"
                : "text-[#14110e]/60 hover:text-[#14110e]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[11px] font-medium hover:bg-[#a94424] disabled:opacity-50"
      >
        {loading ? "Skriver …" : "Generer"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-[11px] text-[#14110e]/55 hover:text-[#14110e]"
      >
        Avbryt
      </button>
      {error && (
        <span className="text-[11px] text-[#D5592E]">{error}</span>
      )}
    </div>
  );
}

function Spark() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}
