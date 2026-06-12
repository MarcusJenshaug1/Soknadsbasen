"use client";

import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { labelForFieldPath } from "@/lib/cv-suggestions";

/**
 * Felt-nivå forslagskort med før/etter-verdi og godta/avslå. Delt mellom
 * collab-innboksen (forslag fra inviterte hjelpere) og AI CV-hjelperen.
 */
export function SuggestionCard({
  fieldPath,
  beforeValue,
  afterValue,
  authorLabel,
  reason,
  busy,
  onAccept,
  onReject,
}: {
  fieldPath: string;
  beforeValue: unknown;
  afterValue: unknown;
  /** F.eks. «Mamma foreslår» eller «AI-hjelperen foreslår». */
  authorLabel: string;
  /** AI-hjelperens begrunnelse — collab-forslag har ingen. */
  reason?: string;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const label = labelForFieldPath(fieldPath);

  return (
    <li className="rounded-xl border border-black/8 dark:border-white/8 bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[11px] text-ink/55 shrink-0">{authorLabel}</span>
      </div>

      <div className="space-y-2">
        <ValueBlock kind="before" value={beforeValue} />
        <div className="flex items-center gap-1.5 text-ink/40">
          <ArrowRight size={13} />
          <span className="text-[10px] uppercase tracking-[0.18em]">Til</span>
        </div>
        <ValueBlock kind="after" value={afterValue} />
      </div>

      {reason && (
        <p className="text-[11.5px] text-ink/55 leading-relaxed">{reason}</p>
      )}

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

function ValueBlock({ kind, value }: { kind: "before" | "after"; value: unknown }) {
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

function ValueItems({ items, className }: { items: string[]; className: string }) {
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

/**
 * Normaliserer en forslagsverdi til en liste av strenger for visning.
 * beforeValue/afterValue kan være string (de fleste felt) ELLER array
 * (skills). Kommaseparerte AI-verdier for skills/interests vises som chips.
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
