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

export function AiDraftButton({
  applicationId,
  letter,
  onDraft,
  onStream,
}: {
  applicationId: string;
  letter: AiLetterMeta;
  onDraft: (html: string) => void;
  onStream?: (text: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<Tone>("varm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    onStream?.("");
    try {
      const res = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, tone, letter }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Kunne ikke hente utkast");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          try {
            const evt = JSON.parse(payload) as {
              chunk?: string;
              done?: boolean;
              html?: string;
              markdown?: string;
              error?: string;
            };
            if (evt.error) throw new Error(evt.error);
            if (evt.chunk) {
              accumulated += evt.chunk;
              onStream?.(accumulated);
            }
            if (evt.done && evt.html) {
              onStream?.(null);
              onDraft(evt.html);
              setOpen(false);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      onStream?.(null);
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
      <div className="inline-flex bg-[#eee9df] dark:bg-panel rounded-full p-1">
        {TONES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTone(t.id)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] transition-colors",
              tone === t.id
                ? "bg-bg text-ink font-medium"
                : "text-ink/60 hover:text-ink",
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
        {loading ? <><SpinnerDots /> Skriver</> : "Generer"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-[11px] text-ink/55 hover:text-ink"
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

function SpinnerDots() {
  return (
    <span className="inline-flex gap-[3px] items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
