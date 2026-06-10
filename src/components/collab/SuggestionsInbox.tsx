"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, ArrowRight, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Eier-innboks for collab-forslag. Lister pending CollabSuggestion for en
 * ressurs og lar eier godta/avslå. Ved accept anvender serveren endringen i
 * CV-en (server-drevet via /resolve), og vi kaller onApplied så editoren kan
 * re-hydrere fersk CV-data.
 *
 * For CV er resourceId = eierens user.id (samme konvensjon som InviteButton).
 */

type SuggestionStatus = "pending" | "accepted" | "rejected";

type SuggestionRow = {
  id: string;
  fieldPath: string;
  beforeValue: unknown;
  afterValue: unknown;
  authorName: string | null;
  status: SuggestionStatus;
  createdAt: string;
};

export function SuggestionsInbox({
  resourceId,
  onApplied,
  onCountChange,
}: {
  resourceId: string;
  /** Kalles etter en vellykket accept, så eier-editoren kan re-hydrere CV-en. */
  onApplied?: () => void;
  /** Rapporterer antall pending tilbake til knappen sin teller. */
  onCountChange?: (count: number) => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/collab/suggest?resourceKind=cv&resourceId=${encodeURIComponent(resourceId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { suggestions: SuggestionRow[] };
      const pending = data.suggestions.filter((s) => s.status === "pending");
      setSuggestions(pending);
      onCountChange?.(pending.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke hente forslag");
    } finally {
      setLoading(false);
    }
  }, [resourceId, onCountChange]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  async function resolve(id: string, action: "accept" | "reject") {
    setResolvingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/collab/suggest/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      setSuggestions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        onCountChange?.(next.length);
        return next;
      });
      // Serveren har allerede skrevet endringen til CV-JSON ved accept, så
      // eier-editoren må re-hydrere for å vise den.
      if (action === "accept") onApplied?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke behandle forslaget");
    } finally {
      setResolvingId(null);
    }
  }

  if (loading && suggestions.length === 0) {
    return (
      <p className="px-6 py-8 text-[12px] text-ink/45">Laster forslag …</p>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center text-center gap-3">
        <span className="size-12 rounded-full bg-panel flex items-center justify-center text-ink/40">
          <Inbox size={20} />
        </span>
        <p className="text-[13px] text-ink/55">Ingen ventende forslag.</p>
        {error && <p className="text-[12px] text-accent">{error}</p>}
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-4">
      {error && <p className="text-[12px] text-accent">{error}</p>}
      <ul className="space-y-3">
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            busy={resolvingId === s.id}
            onAccept={() => resolve(s.id, "accept")}
            onReject={() => resolve(s.id, "reject")}
          />
        ))}
      </ul>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  busy,
  onAccept,
  onReject,
}: {
  suggestion: SuggestionRow;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const label = labelForFieldPath(suggestion.fieldPath);
  const author = suggestion.authorName?.trim() || "En hjelper";

  return (
    <li className="rounded-xl border border-black/8 dark:border-white/8 bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[11px] text-ink/55 shrink-0">
          {author} foreslår
        </span>
      </div>

      <div className="space-y-2">
        <ValueBlock kind="before" value={suggestion.beforeValue} />
        <div className="flex items-center gap-1.5 text-ink/40">
          <ArrowRight size={13} />
          <span className="text-[10px] uppercase tracking-[0.18em]">Til</span>
        </div>
        <ValueBlock kind="after" value={suggestion.afterValue} />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-black/12 dark:border-white/12 text-[12px] text-ink/75 hover:text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors disabled:opacity-40"
        >
          <X size={14} />
          Avslå
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-bg hover:bg-accent-hover transition-colors text-[12px] font-medium disabled:opacity-40"
        >
          <Check size={14} />
          {busy ? "Behandler …" : "Godta"}
        </button>
      </div>
    </li>
  );
}

function ValueBlock({
  kind,
  value,
}: {
  kind: "before" | "after";
  value: unknown;
}) {
  const items = toDisplayItems(value);
  const isEmpty = items.length === 0;

  if (kind === "before") {
    return (
      <div className="rounded-lg bg-panel/60 px-3 py-2">
        {isEmpty ? (
          <span className="text-[12px] text-ink/35 italic">(tomt)</span>
        ) : (
          <ValueItems items={items} className="text-[12px] text-ink/45 line-through" />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-accent/8 border border-accent/20 px-3 py-2">
      {isEmpty ? (
        <span className="text-[12px] text-ink/35 italic">(tomt)</span>
      ) : (
        <ValueItems items={items} className="text-[12px] text-accent font-medium" />
      )}
    </div>
  );
}

function ValueItems({
  items,
  className,
}: {
  items: string[];
  className: string;
}) {
  // Array-verdier (f.eks. skills) vises som chips; string-verdier som tekst.
  if (items.length > 1) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={cn(
              "inline-flex px-2 py-0.5 rounded-full bg-bg border border-black/8 dark:border-white/8",
              className,
            )}
          >
            {item}
          </span>
        ))}
      </div>
    );
  }
  return <p className={cn("whitespace-pre-wrap break-words", className)}>{items[0]}</p>;
}

/* ─── Helpers ────────────────────────────────────────────────── */

/**
 * Normaliserer en suggestion-verdi til en liste av strenger for visning.
 * Håndterer at beforeValue/afterValue kan være string (de fleste felt) ELLER
 * array (skills). Tomme/whitespace-verdier filtreres bort.
 */
function toDisplayItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : String(v ?? "")).trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }
  if (value == null) return [];
  return [String(value)];
}

/**
 * Oversetter en CollabSuggestion.fieldPath til en menneskelig norsk label.
 * Indekserte stier ("experience.2.description") får 1-basert nummer i labelen.
 */
function labelForFieldPath(fieldPath: string): string {
  const direct: Record<string, string> = {
    role: "Ønsket rolle",
    summary: "Profil",
    skills: "Ferdigheter",
  };
  if (fieldPath in direct) return direct[fieldPath];

  const expMatch = fieldPath.match(/^experience\.(\d+)\.description$/);
  if (expMatch) return `Erfaring #${Number(expMatch[1]) + 1} – beskrivelse`;

  const eduMatch = fieldPath.match(/^education\.(\d+)\.description$/);
  if (eduMatch) return `Utdanning #${Number(eduMatch[1]) + 1}`;

  return fieldPath;
}
