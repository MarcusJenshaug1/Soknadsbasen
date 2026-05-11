"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useCollabStore, type PendingSuggestion } from "@/store/useCollabStore";

/**
 * Floating badge plassert ved inputet som har et pending forslag.
 * Posisjoneres via getBoundingClientRect på elementet med
 * `[data-cv-field="<fieldPath>"]`. Reposisjoneres ved scroll/resize.
 *
 * Tegnes utenfor editor-DOM (fixed-positioned overlay) så den kan flyte
 * over alt. Brukes av eieren — anonyme ser den ikke (de ser sin egen
 * draft i SuggestPopup).
 */

type Anchor = {
  top: number;
  left: number;
  width: number;
};

// Stabil ref til tom array. Uten denne returnerte `?? []` en ny `[]` per
// render → useSyncExternalStore (Zustand) tolket det som tearing og fyrte
// re-render → infinite loop (React #185, "Maximum update depth exceeded").
const EMPTY_PENDING: readonly PendingSuggestion[] = [];

export function InlineSuggestionBadge({
  resourceKind,
  resourceId,
}: {
  resourceKind: "cv" | "letter" | "application";
  resourceId: string;
}) {
  const pending = useCollabStore((s) => {
    const key = `${resourceKind}:${resourceId}`;
    return s.pendingByResource[key] ?? EMPTY_PENDING;
  });

  if (pending.length === 0) return null;

  return (
    <>
      {pending.map((suggestion) => (
        <SuggestionAnchored
          key={suggestion.id}
          suggestion={suggestion}
          resourceKind={resourceKind}
          resourceId={resourceId}
        />
      ))}
    </>
  );
}

function SuggestionAnchored({
  suggestion,
  resourceKind,
  resourceId,
}: {
  suggestion: PendingSuggestion;
  resourceKind: "cv" | "letter" | "application";
  resourceId: string;
}) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [busy, setBusy] = useState(false);
  const removePending = useCollabStore((s) => s.removePending);

  useEffect(() => {
    let cancelled = false;

    function reposition() {
      if (cancelled) return;
      // Match elementer som har enten data-cv-field eller data-collab-field
      const el = document.querySelector<HTMLElement>(
        `[data-cv-field="${cssEscape(suggestion.fieldPath)}"], [data-collab-field="${cssEscape(suggestion.fieldPath)}"]`,
      );
      if (!el) {
        setAnchor(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setAnchor({ top: r.top, left: r.right + 8, width: r.width });
    }

    reposition();
    const tick = setInterval(reposition, 500); // i tilfelle DOM endres
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      cancelled = true;
      clearInterval(tick);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [suggestion.fieldPath]);

  async function resolve(action: "accept" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(`/api/collab/suggest/${suggestion.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        console.warn("[InlineSuggestion] resolve failed:", payload);
        return;
      }
      // TODO i Hocuspocus-integrasjon: hvis accept, applye fieldPath →
      // afterValue til Y.Doc via useYjsSync. Frem til da må eier
      // re-skrive verdien manuelt — eller vi appliyer via REST på
      // server-siden (kommer i Fase 1.4).
      removePending(resourceKind, resourceId, suggestion.id);
    } finally {
      setBusy(false);
    }
  }

  if (!anchor) return null;

  const beforePreview = previewValue(suggestion.beforeValue);
  const afterPreview = previewValue(suggestion.afterValue);

  return (
    <div
      className="fixed z-[70] pointer-events-auto"
      style={{ top: `${Math.round(anchor.top)}px`, left: `${Math.round(anchor.left)}px` }}
    >
      <div className="w-[280px] rounded-xl bg-bg border border-amber-300 shadow-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-amber-700 font-semibold">
            Forslag fra {suggestion.authorName}
          </span>
        </div>
        {beforePreview && (
          <div className="text-[11px] text-ink/55 line-through italic break-words">
            {beforePreview}
          </div>
        )}
        <div className="text-[12px] text-ink leading-[1.5] break-words flex gap-1.5">
          <span className="text-emerald-700 shrink-0">→</span>
          <span>{afterPreview}</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => resolve("reject")}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/15 text-[11px] hover:bg-black/5 disabled:opacity-40"
          >
            <X size={11} />
            Avvis
          </button>
          <button
            type="button"
            onClick={() => resolve("accept")}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 disabled:opacity-40"
          >
            <Check size={11} />
            Godta
          </button>
        </div>
      </div>
    </div>
  );
}

function previewValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    const stripped = value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return stripped.length > 140 ? stripped.slice(0, 140) + "…" : stripped;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value).slice(0, 140);
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/(["\\\]:.])/g, "\\$1");
}
