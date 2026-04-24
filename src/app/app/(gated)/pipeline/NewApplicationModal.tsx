"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconClose, IconPlus } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

type Mode = "manual" | "url" | "paste";

type Draft = {
  title: string;
  companyName: string;
  companyWebsite: string;
  source: string;
  jobUrl: string;
  jobDescription: string;
  deadline: string;
  offerSalary: string;
  location: string;
};

const EMPTY: Draft = {
  title: "",
  companyName: "",
  companyWebsite: "",
  source: "",
  jobUrl: "",
  jobDescription: "",
  deadline: "",
  offerSalary: "",
  location: "",
};

const SOURCES = ["LinkedIn", "FINN.no", "Webcruiter", "Direkte kontakt", "Referanse", "Annet"];

const INPUT =
  "w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#D5592E]";
const LABEL = "text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-1.5";

export function NewApplicationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [status, setStatus] = useState<"idle" | "extracting" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function extractFromUrl() {
    if (!url.trim()) {
      setError("Lim inn en lenke først.");
      return;
    }
    setStatus("extracting");
    setError(null);
    try {
      const res = await fetch("/api/ai/parse-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke tolke stillingen");
      setDraft({
        title: data.title ?? "",
        companyName: data.companyName ?? "",
        companyWebsite: data.companyWebsite ?? "",
        source: data.source ?? "",
        jobUrl: url,
        jobDescription: data.jobDescription ?? "",
        deadline: data.deadline ?? "",
        offerSalary: data.salary ?? "",
        location: data.location ?? "",
      });
      setMode("manual");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setStatus("idle");
    }
  }

  async function extractFromPaste() {
    if (!pastedText.trim()) {
      setError("Lim inn stillingstekst først.");
      return;
    }
    setStatus("extracting");
    setError(null);
    try {
      const res = await fetch("/api/ai/parse-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke tolke stillingen");
      setDraft({
        title: data.title ?? "",
        companyName: data.companyName ?? "",
        companyWebsite: data.companyWebsite ?? "",
        source: data.source ?? "",
        jobUrl: "",
        jobDescription: data.jobDescription ?? "",
        deadline: data.deadline ?? "",
        offerSalary: data.salary ?? "",
        location: data.location ?? "",
      });
      setMode("manual");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setStatus("idle");
    }
  }

  async function save() {
    if (!draft.title.trim() || !draft.companyName.trim()) {
      setError("Stillingstittel og selskap er påkrevd.");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          companyName: draft.companyName,
          companyWebsite: draft.companyWebsite || undefined,
          source: draft.source || undefined,
          jobUrl: draft.jobUrl || undefined,
          jobDescription: draft.jobDescription || undefined,
          deadlineAt: draft.deadline ? new Date(draft.deadline + "T12:00:00Z").toISOString() : undefined,
          notes: draft.location ? `Sted: ${draft.location}` : undefined,
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke lagre");
      close();
      router.refresh();
      if (data.id) router.push(`/app/pipeline/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setStatus("idle");
    }
  }

  function close() {
    onClose();
    setTimeout(() => {
      setMode("manual");
      setDraft(EMPTY);
      setUrl("");
      setPastedText("");
      setError(null);
      setStatus("idle");
    }, 200);
  }

  if (!open) return null;

  const extracting = status === "extracting";
  const saving = status === "saving";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#14110e]/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative bg-[#faf8f5] rounded-3xl w-full max-w-[680px] max-h-[88vh] overflow-hidden flex flex-col border border-black/8">
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/8">
          <div>
            <SectionLabel>Ny søknad</SectionLabel>
            <h2 className="text-[20px] font-medium tracking-tight mt-1">
              Legg til stilling
            </h2>
          </div>
          <button
            onClick={close}
            className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60"
            aria-label="Lukk"
          >
            <IconClose size={18} />
          </button>
        </header>

        <div className="px-6 pt-4 pb-2 border-b border-black/8">
          <div className="inline-flex bg-[#eee9df] rounded-full p-1 gap-1">
            {(["manual", "url", "paste"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12px] transition-colors",
                  mode === m
                    ? "bg-[#faf8f5] text-[#14110e] font-medium"
                    : "text-[#14110e]/60 hover:text-[#14110e]",
                )}
              >
                {m === "manual" ? "Manuelt" : m === "url" ? "Fra lenke" : "Lim inn tekst"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {mode === "url" && (
            <UrlStep
              url={url}
              setUrl={setUrl}
              onExtract={extractFromUrl}
              extracting={extracting}
            />
          )}
          {mode === "paste" && (
            <PasteStep
              text={pastedText}
              setText={setPastedText}
              onExtract={extractFromPaste}
              extracting={extracting}
            />
          )}
          {mode === "manual" && (
            <ManualStep draft={draft} update={update} />
          )}

          {error && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-[#D5592E]/10 border border-[#D5592E]/30 text-[12px] text-[#D5592E]">
              {error}
            </div>
          )}
        </div>

        {mode === "manual" && (
          <footer className="px-6 py-4 border-t border-black/8 flex items-center justify-end gap-2 bg-[#eee9df]/40">
            <button
              onClick={close}
              className="px-4 py-2 rounded-full text-[12px] border border-black/15 hover:border-black/30"
            >
              Avbryt
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] text-[12px] font-medium hover:bg-[#a94424] disabled:opacity-50"
            >
              <IconPlus size={14} />
              {saving ? "Lagrer …" : "Opprett søknad"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function UrlStep({
  url,
  setUrl,
  onExtract,
  extracting,
}: {
  url: string;
  setUrl: (v: string) => void;
  onExtract: () => void;
  extracting: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#14110e]/65 leading-relaxed">
        Lim inn lenken til stillingsannonsen (FINN.no, Webcruiter, NAV, selskapets
        egen side). AI henter tittel, selskap, beskrivelse og frist. Tips: LinkedIn
        krever ofte innlogging — bruk &quot;Lim inn tekst&quot; i stedet.
      </p>
      <div>
        <label className={LABEL}>Stillings-URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://finn.no/…"
          className={INPUT}
        />
      </div>
      <button
        onClick={onExtract}
        disabled={extracting || !url.trim()}
        className="w-full py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] disabled:opacity-50"
      >
        {extracting ? "Henter og tolker …" : "Hent fra lenke"}
      </button>
    </div>
  );
}

function PasteStep({
  text,
  setText,
  onExtract,
  extracting,
}: {
  text: string;
  setText: (v: string) => void;
  onExtract: () => void;
  extracting: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#14110e]/65 leading-relaxed">
        Kopier hele stillingsteksten fra annonsen og lim inn her. AI trekker ut
        tittel, selskap, beskrivelse osv.
      </p>
      <div>
        <label className={LABEL}>Stillingstekst</label>
        <textarea
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Lim inn hele annonseteksten her …"
          className={cn(INPUT, "resize-y")}
        />
      </div>
      <button
        onClick={onExtract}
        disabled={extracting || !text.trim()}
        className="w-full py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] disabled:opacity-50"
      >
        {extracting ? "Tolker …" : "Tolk teksten"}
      </button>
    </div>
  );
}

function ManualStep({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={LABEL}>Stillingstittel *</label>
          <input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Senior produktdesigner"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Selskap *</label>
          <input
            value={draft.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Schibsted"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Nettside</label>
          <input
            type="url"
            value={draft.companyWebsite}
            onChange={(e) => update("companyWebsite", e.target.value)}
            placeholder="schibsted.no"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Kilde</label>
          <input
            value={draft.source}
            onChange={(e) => update("source", e.target.value)}
            list="source-options"
            placeholder="LinkedIn / FINN.no / …"
            className={INPUT}
          />
          <datalist id="source-options">
            {SOURCES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={LABEL}>Stillings-URL</label>
          <input
            type="url"
            value={draft.jobUrl}
            onChange={(e) => update("jobUrl", e.target.value)}
            placeholder="https://…"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Søknadsfrist</label>
          <input
            type="date"
            value={draft.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Lønn</label>
          <input
            value={draft.offerSalary}
            onChange={(e) => update("offerSalary", e.target.value)}
            placeholder="780 000 NOK"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Sted</label>
          <input
            value={draft.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Oslo"
            className={INPUT}
          />
        </div>
      </div>
      <div>
        <label className={LABEL}>Stillingsbeskrivelse</label>
        <textarea
          rows={7}
          value={draft.jobDescription}
          onChange={(e) => update("jobDescription", e.target.value)}
          placeholder="Lim inn stillingsteksten her …"
          className={cn(INPUT, "resize-y")}
        />
      </div>
    </div>
  );
}
