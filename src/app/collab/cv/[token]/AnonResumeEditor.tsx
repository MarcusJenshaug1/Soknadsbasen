"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Pencil,
  Sparkles,
  Send,
  Check,
  X,
  AlertCircle,
  Eye,
  ListChecks,
} from "lucide-react";
import { TemplateRenderer } from "@/components/templates";
import { getGoogleFontsUrl } from "@/lib/design-tokens";
import { cn } from "@/lib/cn";
import type { ResumeData } from "@/store/useResumeStore";

type AiKind = "summary" | "role" | "experience" | "education" | "generic";

/** Et redigerbart felt utledet fra eierens CV. `afterValue` sendes som-is til
 * /api/collab/suggest, så skills bærer string[] mens resten bærer string. */
type EditableField = {
  /** Stabil nøkkel for lokal state (forslag-sendt-merking, åpen editor). */
  key: string;
  fieldPath: string;
  label: string;
  /** Liten kontekst over feltet (f.eks. "Utvikler @ Acme"). */
  context?: string;
  kind: AiKind;
  /** Råverdien fra CV-en, vist read-only. */
  currentValue: string;
  /** True for skills: tekst tolkes komma-separert ved sending. */
  isCommaList?: boolean;
};

/**
 * Invitert medhjelpers RIKE editor. Henter eierens aktive CV-snapshot
 * (read-only) via JWT-autentisert endepunkt. Medhjelperen ser hvert
 * redigerbart tekstfelt med nåværende verdi, kan forhåndsutfylle en
 * inline-editor, forbedre med AI, og sende et målrettet forslag som eieren
 * godkjenner. Live full-co-editing (Yjs) kan legges på senere.
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
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // Hvilket felt har en åpen inline-editor (én om gangen, etter felt-key).
  const [openKey, setOpenKey] = useState<string | null>(null);
  // Felt-keys der et forslag er sendt i denne sesjonen.
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collab/cv-data", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        // Lenken kan være revokert (404/410) eller tokenet utløpt (401) —
        // nullstill data så editoren disables og feil-skjermen vises.
        if ([401, 404, 410].includes(res.status)) setData(null);
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

  const fields = useMemo(() => (data ? buildEditableFields(data) : []), [data]);
  const fontsUrl = data ? getGoogleFontsUrl(data.fontPair) : null;
  const sentCount = sentKeys.size;

  function handleSent(key: string) {
    setSentKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setOpenKey(null);
  }

  return (
    <div className="min-h-dvh bg-panel/40">
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}

      <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur-md border-b border-black/8 dark:border-white/8">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent">
              Medhjelper
            </div>
            <div className="text-[14px] font-medium truncate">
              {ownerName} sin CV
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sentCount > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/12 text-success text-[12px] font-medium"
                aria-live="polite"
              >
                <Check size={13} />
                {sentCount} {sentCount === 1 ? "forslag sendt" : "forslag sendt"}
              </span>
            )}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-black/10 dark:border-white/10 text-[12px] hover:border-black/25 dark:hover:border-white/25 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Oppdater
            </button>
          </div>
        </div>

        {sentCount > 0 && (
          <div className="sm:hidden max-w-[1200px] mx-auto px-4 pb-2 -mt-1">
            <span
              className="inline-flex items-center gap-1.5 text-[12px] text-success"
              aria-live="polite"
            >
              <Check size={13} />
              {sentCount} forslag sendt
            </span>
          </div>
        )}

        {error && data && (
          <div
            role="alert"
            className="max-w-[1200px] mx-auto px-4 pb-2 -mt-1 flex items-center gap-1.5 text-[12px] text-accent"
          >
            <AlertCircle size={13} />
            {error} — viser sist hentede versjon.
          </div>
        )}

        {/* Mobil-faner: Rediger / Forhåndsvisning */}
        {data && (
          <div className="lg:hidden max-w-[1200px] mx-auto px-4 pb-2">
            <div
              role="tablist"
              aria-label="Vis"
              className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface border border-black/8 dark:border-white/8"
            >
              <TabButton
                active={mobileTab === "edit"}
                onClick={() => setMobileTab("edit")}
                icon={<ListChecks size={14} />}
                label="Rediger"
              />
              <TabButton
                active={mobileTab === "preview"}
                onClick={() => setMobileTab("preview")}
                icon={<Eye size={14} />}
                label="Forhåndsvisning"
              />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-6" aria-busy={loading}>
        {loading && !data && (
          <div
            className="py-24 text-center text-[13px] text-ink/55"
            aria-live="polite"
          >
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Venstre: redigerbar felt-liste */}
            <section
              aria-label="Rediger felter"
              className={cn(
                "min-w-0 space-y-3",
                mobileTab === "preview" && "hidden lg:block",
              )}
            >
              <p className="text-[12px] text-ink/55 leading-relaxed">
                Foreslå forbedringer på {ownerName} sine felter. Forslagene må
                godkjennes av eieren før de havner i CV-en.
              </p>
              {fields.map((field) => (
                <FieldCard
                  key={field.key}
                  field={field}
                  jwt={jwt}
                  open={openKey === field.key}
                  sent={sentKeys.has(field.key)}
                  onOpen={() => setOpenKey(field.key)}
                  onCancel={() => setOpenKey(null)}
                  onSent={() => handleSent(field.key)}
                />
              ))}
            </section>

            {/* Høyre: live read-only preview */}
            <section
              aria-label="Forhåndsvisning"
              className={cn(
                "min-w-0 lg:sticky lg:top-[120px]",
                mobileTab === "edit" && "hidden lg:block",
              )}
            >
              <div className="bg-white text-black rounded-xl shadow-lg overflow-hidden">
                <TemplateRenderer data={data} />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Mobil-fane-knapp ────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-colors",
        active
          ? "bg-bg text-ink shadow-sm"
          : "text-ink/55 hover:text-ink/80",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Felt-kort: nåværende verdi + inline-editor ──────────────── */

function FieldCard({
  field,
  jwt,
  open,
  sent,
  onOpen,
  onCancel,
  onSent,
}: {
  field: EditableField;
  jwt: string;
  open: boolean;
  sent: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onSent: () => void;
}) {
  const hasValue = field.currentValue.trim().length > 0;

  return (
    <article className="rounded-2xl border border-black/8 dark:border-white/8 bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-medium">{field.label}</div>
          {field.context && (
            <div className="text-[11px] text-ink/50 truncate">{field.context}</div>
          )}
        </div>
        {sent ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-success font-medium shrink-0">
            <Check size={13} />
            Forslag sendt
          </span>
        ) : (
          !open && (
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 text-[12px] hover:border-accent hover:text-accent transition-colors shrink-0"
            >
              <Pencil size={12} />
              Foreslå endring
            </button>
          )
        )}
      </div>

      {!open && (
        <p
          className={cn(
            "mt-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
            hasValue ? "text-ink/75" : "text-ink/40 italic",
          )}
        >
          {hasValue ? field.currentValue : "Ingen verdi enda"}
        </p>
      )}

      {open && (
        <InlineEditor
          field={field}
          jwt={jwt}
          onCancel={onCancel}
          onSent={onSent}
        />
      )}
    </article>
  );
}

/* ─── Inline-editor: textarea + AI + send ─────────────────────── */

function InlineEditor({
  field,
  jwt,
  onCancel,
  onSent,
}: {
  field: EditableField;
  jwt: string;
  onCancel: () => void;
  onSent: () => void;
}) {
  const [text, setText] = useState(field.currentValue);
  const [aiStatus, setAiStatus] = useState<"idle" | "working">("idle");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  async function improveWithAi() {
    const trimmed = text.trim();
    if (!trimmed || aiStatus === "working") return;
    setAiStatus("working");
    setError(null);
    try {
      const res = await fetch("/api/collab/ai-improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ text: trimmed, kind: field.kind }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 429) {
          throw new Error(body.error ?? "For mange AI-forespørsler. Vent litt.");
        }
        if (res.status === 401 || res.status === 410) {
          throw new Error(body.error ?? "Lenken er ikke lenger gyldig.");
        }
        throw new Error(body.error ?? "AI-forbedring feilet. Prøv igjen.");
      }
      const body = (await res.json()) as { improved: string };
      setText(body.improved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt");
    } finally {
      setAiStatus("idle");
    }
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sendStatus === "sending") return;
    setSendStatus("sending");
    setError(null);

    // Skills sendes som string[]; resten som string. beforeValue speiler
    // feltets råform så eieren ser en ren diff.
    const afterValue = field.isCommaList ? toSkillsArray(trimmed) : trimmed;
    const beforeValue = field.isCommaList
      ? toSkillsArray(field.currentValue)
      : field.currentValue;

    try {
      const res = await fetch("/api/collab/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          fieldPath: field.fieldPath,
          beforeValue,
          afterValue,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 429) {
          throw new Error(
            body.error ?? "For mange forslag akkurat nå. Vent litt og prøv igjen.",
          );
        }
        if (res.status === 410) {
          throw new Error(
            body.error ?? "Lenken er trukket tilbake. Be om en ny invitasjon.",
          );
        }
        if (res.status === 401) {
          throw new Error(body.error ?? "Lenken er utløpt. Be om en ny invitasjon.");
        }
        throw new Error(body.error ?? "Kunne ikke sende forslaget");
      }
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt");
      setSendStatus("idle");
    }
  }

  return (
    <div className="mt-3">
      <label className="block text-[11px] uppercase tracking-wider text-ink/55 mb-1.5">
        Ditt forslag
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={field.isCommaList ? 3 : 5}
        maxLength={4000}
        autoFocus
        placeholder={
          field.isCommaList
            ? "Skriv ferdigheter, skilt med komma …"
            : "Skriv ditt forslag …"
        }
        className="w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent resize-y"
      />
      {field.isCommaList && (
        <p className="mt-1 text-[11px] text-ink/45">
          Skill teksten med komma — hver del blir en egen ferdighet.
        </p>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-2 flex items-center gap-1.5 text-[12px] text-accent"
        >
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={improveWithAi}
          disabled={!text.trim() || aiStatus === "working" || sendStatus === "sending"}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-accent/40 text-accent text-[12px] font-medium hover:bg-accent/10 transition-colors disabled:opacity-50"
        >
          <Sparkles size={13} className={aiStatus === "working" ? "animate-pulse" : ""} />
          {aiStatus === "working" ? "Forbedrer …" : "Forbedre med AI"}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={sendStatus === "sending"}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-[12px] border border-black/12 dark:border-white/12 hover:border-black/30 dark:hover:border-white/30 transition-colors disabled:opacity-50"
          >
            <X size={13} />
            Avbryt
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!text.trim() || sendStatus === "sending" || aiStatus === "working"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Send size={13} />
            {sendStatus === "sending" ? "Sender …" : "Send forslag"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function toSkillsArray(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Utleder de redigerbare tekstfeltene fra en ResumeData. fieldPath er
 * id-basert for liste-elementer ("experience.id:<uuid>.description"), slik at
 * et forslag treffer riktig element selv om eieren har rokkert om eller slettet
 * andre rader mellom invitasjon og godkjenning. */
function buildEditableFields(data: ResumeData): EditableField[] {
  const fields: EditableField[] = [];

  fields.push({
    key: "role",
    fieldPath: "role",
    label: "Ønsket rolle",
    kind: "role",
    currentValue: data.role ?? "",
  });

  fields.push({
    key: "summary",
    fieldPath: "summary",
    label: "Profil / sammendrag",
    kind: "summary",
    currentValue: data.summary ?? "",
  });

  data.experience?.forEach((exp) => {
    if (!exp.id) return; // uten id kan ikke eieren matche forslaget trygt
    fields.push({
      key: `experience-${exp.id}`,
      fieldPath: `experience.id:${exp.id}.description`,
      label: "Erfaring, beskrivelse",
      context: experienceContext(exp.title, exp.company),
      kind: "experience",
      currentValue: exp.description ?? "",
    });
  });

  data.education?.forEach((edu) => {
    if (!edu.id) return;
    fields.push({
      key: `education-${edu.id}`,
      fieldPath: `education.id:${edu.id}.description`,
      label: "Utdanning, beskrivelse",
      context: educationContext(edu.degree, edu.field, edu.school),
      kind: "education",
      currentValue: edu.description ?? "",
    });
  });

  fields.push({
    key: "skills",
    fieldPath: "skills",
    label: "Ferdigheter",
    context: "Komma-separert",
    kind: "generic",
    currentValue: (data.skills ?? []).join(", "),
    isCommaList: true,
  });

  return fields;
}

function experienceContext(title?: string, company?: string): string | undefined {
  const t = title?.trim();
  const c = company?.trim();
  if (t && c) return `${t} @ ${c}`;
  return t || c || undefined;
}

function educationContext(
  degree?: string,
  field?: string,
  school?: string,
): string | undefined {
  const main = [degree?.trim(), field?.trim()].filter(Boolean).join(", ");
  const s = school?.trim();
  if (main && s) return `${main} @ ${s}`;
  return main || s || undefined;
}
