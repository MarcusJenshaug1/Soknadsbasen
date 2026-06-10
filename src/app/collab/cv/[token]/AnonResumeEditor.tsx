"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, MessageSquarePlus, Check, AlertCircle } from "lucide-react";
import { TemplateRenderer } from "@/components/templates";
import { Modal } from "@/components/ui/Modal";
import { getGoogleFontsUrl } from "@/lib/design-tokens";
import type { ResumeData } from "@/store/useResumeStore";

const SECTIONS = [
  { value: "summary", label: "Profil / sammendrag" },
  { value: "experience", label: "Erfaring" },
  { value: "education", label: "Utdanning" },
  { value: "skills", label: "Ferdigheter" },
  { value: "languages", label: "Språk" },
  { value: "contact", label: "Kontaktinfo" },
  { value: "general", label: "Generelt / annet" },
];

/**
 * Invitert medhjelpers visning av en CV. Henter eierens aktive CV-snapshot
 * (read-only) via JWT-autentisert endepunkt og lar medhjelperen sende
 * forslag som eieren godkjenner. Live full-co-editing (Yjs) kan legges på
 * senere; dette gir en ekte, ærlig medhjelper-opplevelse uten den.
 */
export function AnonResumeEditor({
  jwt,
  ownerDisplayName,
}: {
  jwt: string;
  ownerDisplayName: string;
}) {
  const [data, setData] = useState<ResumeData | null>(null);
  const [ownerName, setOwnerName] = useState(ownerDisplayName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collab/cv-data", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Kunne ikke laste CV-en");
      }
      const payload = (await res.json()) as { data: ResumeData; ownerName: string };
      setData(payload.data);
      setOwnerName(payload.ownerName || ownerDisplayName);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt");
    } finally {
      setLoading(false);
    }
  }, [jwt, ownerDisplayName]);

  useEffect(() => {
    load();
  }, [load]);

  const fontsUrl = data ? getGoogleFontsUrl(data.fontPair) : null;

  return (
    <div className="min-h-dvh bg-panel/40">
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}

      <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur-md border-b border-black/8 dark:border-white/8">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent">
              Medhjelper
            </div>
            <div className="text-[14px] font-medium truncate">
              {ownerName} sin CV
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-black/10 dark:border-white/10 text-[12px] hover:border-black/25 dark:hover:border-white/25 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Oppdater
            </button>
            <button
              type="button"
              onClick={() => setSuggestOpen(true)}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              <MessageSquarePlus size={14} />
              Foreslå endring
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 py-8">
        {loading && !data && (
          <div className="py-24 text-center text-[13px] text-ink/55">
            Laster {ownerName} sin CV …
          </div>
        )}
        {error && !data && (
          <div className="max-w-md mx-auto py-24 text-center">
            <AlertCircle className="mx-auto mb-3 text-accent" size={28} />
            <p className="text-[14px] text-ink/70 mb-4">{error}</p>
            <button
              type="button"
              onClick={load}
              className="px-5 py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium"
            >
              Prøv igjen
            </button>
          </div>
        )}
        {data && (
          <div className="bg-white text-black rounded-xl shadow-lg overflow-hidden mx-auto">
            <TemplateRenderer data={data} />
          </div>
        )}
      </main>

      <SuggestModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        jwt={jwt}
      />
    </div>
  );
}

function SuggestModal({
  open,
  onClose,
  jwt,
}: {
  open: boolean;
  onClose: () => void;
  jwt: string;
}) {
  const [section, setSection] = useState(SECTIONS[0].value);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/collab/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          fieldPath: section,
          beforeValue: "",
          afterValue: text.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Kunne ikke sende forslaget");
      }
      setStatus("sent");
      setTimeout(() => {
        setText("");
        setStatus("idle");
        onClose();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt");
      setStatus("error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Foreslå endring"
      panelClassName="bg-bg rounded-3xl w-full max-w-[480px] border border-black/8 dark:border-white/8 shadow-2xl p-6"
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
        Forslag
      </div>
      <h2 className="text-[20px] font-medium tracking-tight mb-4">
        Foreslå en endring
      </h2>

      {status === "sent" ? (
        <div className="py-8 text-center">
          <Check className="mx-auto mb-2 text-success" size={28} />
          <p className="text-[14px] text-ink/70">
            Forslaget er sendt — eieren godkjenner det.
          </p>
        </div>
      ) : (
        <>
          <label className="block text-[11px] uppercase tracking-wider text-ink/55 mb-1.5">
            Hvilken del gjelder det?
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent mb-4"
          >
            {SECTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <label className="block text-[11px] uppercase tracking-wider text-ink/55 mb-1.5">
            Forslaget ditt
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={2000}
            autoFocus
            placeholder="Beskriv hva du foreslår å endre eller legge til …"
            className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent resize-none"
          />

          {error && (
            <div
              role="alert"
              className="mt-3 flex items-center gap-2 text-[12px] text-accent"
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-[12px] border border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || status === "sending"}
              className="px-5 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-accent-hover disabled:opacity-50"
            >
              {status === "sending" ? "Sender …" : "Send forslag"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
