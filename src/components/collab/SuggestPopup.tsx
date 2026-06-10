"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

/**
 * Popup som åpnes når en anonym hjelper klikker på et felt for å foreslå
 * en endring. Pre-fyller textarea med nåværende verdi. På submit POST-er
 * til /api/collab/suggest med Bearer-tokenet de fikk fra /api/collab/join.
 *
 * Returnerer success-toast i parent via onSent-callback.
 */
export function SuggestPopup({
  open,
  onClose,
  fieldLabel,
  fieldPath,
  beforeValue,
  bearerToken,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  fieldLabel: string;
  fieldPath: string;
  beforeValue: string;
  bearerToken: string;
  onSent: () => void;
}) {
  const [value, setValue] = useState(beforeValue);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(beforeValue);
      setError(null);
    }
  }, [open, beforeValue]);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/collab/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          fieldPath,
          beforeValue,
          afterValue: value,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      onSent();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke sende forslag");
    } finally {
      setSending(false);
    }
  }

  const changed = value !== beforeValue;
  const isLongText = beforeValue.length > 80;

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={`Foreslå endring i ${fieldLabel}`}
      panelClassName="w-full max-w-[520px] rounded-2xl bg-bg shadow-2xl border border-black/10"
    >
      <div className="border-b border-black/8 px-5 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Foreslå endring
          </div>
          <h2 className="text-[15px] font-medium tracking-tight text-ink mt-0.5">
            {fieldLabel}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60 hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {isLongText ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={8}
            autoFocus
            className="w-full border border-black/15 rounded-xl px-3 py-2 text-[13px] bg-surface outline-none focus:border-ink resize-y leading-[1.55]"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="w-full border-b border-black/20 bg-transparent py-2 text-[15px] outline-none focus:border-ink"
          />
        )}
        <p className="text-[11px] text-[#14110e]/55 leading-[1.5]">
          Eieren får forslaget og kan godta eller avvise det. Det blir ikke
          lagret før de godkjenner.
        </p>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </div>

      <div className="border-t border-black/8 px-5 py-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-full border border-black/15 text-[13px] hover:bg-black/5"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={send}
          disabled={!changed || sending}
          className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] disabled:opacity-40"
        >
          {sending ? "Sender …" : "Send forslag"}
        </button>
      </div>
    </Modal>
  );
}
