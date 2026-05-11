"use client";

import { useState } from "react";

const LS_KEY = "collab-display-name";

export function getStoredCollabName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredCollabName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, name);
  } catch {
    // ignore
  }
}

/**
 * Vises første gang en anonym åpner en collab-lenke. Spør om navn, lagrer
 * i localStorage for retur, redirecter videre til editor.
 */
export function JoinNameModal({
  preview,
  onSubmit,
  onCancel,
}: {
  preview: {
    resourceKind: "cv" | "letter" | "application";
    ownerDisplayName: string;
    label: string | null;
  };
  onSubmit: (name: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(() => getStoredCollabName());
  const [submitting, setSubmitting] = useState(false);

  const resourceLabel =
    preview.resourceKind === "cv"
      ? "CV-en"
      : preview.resourceKind === "letter"
        ? "søknadsbrevet"
        : "søknaden";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setStoredCollabName(trimmed);
    onSubmit(trimmed);
  }

  return (
    <div
      role="dialog"
      aria-label="Bli med i collab"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-[440px] rounded-2xl bg-bg shadow-2xl border border-black/10 p-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
          Du er invitert
        </div>
        <h2 className="text-[20px] font-medium tracking-tight text-ink mb-2">
          Hjelp {preview.ownerDisplayName} med {resourceLabel}
        </h2>
        {preview.label && (
          <p className="text-[12px] text-[#14110e]/55 mb-4">
            Lenke: <span className="italic">{preview.label}</span>
          </p>
        )}
        <p className="text-[13px] text-[#14110e]/70 leading-[1.55] mb-5">
          Du kan se {resourceLabel} live og foreslå endringer. {preview.ownerDisplayName} må godkjenne hvert forslag.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#14110e]/55 mb-1.5">
              Hva heter du?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={60}
              placeholder="Fornavn"
              className="w-full border-b border-black/20 bg-transparent py-2 text-[15px] outline-none focus:border-ink"
            />
            <p className="text-[11px] text-[#14110e]/40 mt-1">
              Vises for eieren når du foreslår endringer.
            </p>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-full border border-black/15 text-[13px] hover:bg-black/5"
              >
                Avbryt
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] disabled:opacity-40"
            >
              {submitting ? "Kobler til …" : "Bli med"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
