"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiBell, FiCheck } from "react-icons/fi";

import { Modal } from "@/components/ui/Modal";
import { createSavedSearch } from "@/lib/jobs/saved-search-actions";

/**
 * «Lagre søk» (designreferansen): pill-knapp m/bjelle som lagrer aktiv
 * filterkombinasjon som navngitt søk med varsler. Liten navnedialog;
 * uinnloggede sendes til registrering med retur hit.
 */
export function SaveSearchButton({
  query,
  suggestedName,
  loggedIn,
  primary = false,
}: {
  /** Kanonisk querystring uten «/jobb?» (tom = alle stillinger). */
  query: string;
  suggestedName: string;
  loggedIn: boolean;
  /** Tom-tilstandens variant (fylt knapp). */
  primary?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    if (!loggedIn) {
      router.push(
        `/registrer?redirect=${encodeURIComponent(query ? `/jobb?${query}` : "/jobb")}`,
      );
      return;
    }
    setName(suggestedName);
    setError(null);
    setOpen(true);
  };

  async function save() {
    setBusy(true);
    setError(null);
    const res = await createSavedSearch(name, query);
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setOpen(false);
    } else {
      setError(res.error);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={saved ? undefined : openDialog}
        aria-pressed={saved}
        className={`flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 ${
          saved || primary
            ? "border-ink bg-ink text-bg"
            : "border-border bg-surface text-ink hover:border-ink"
        }`}
      >
        {saved ? <FiCheck size={13} aria-hidden /> : <FiBell size={13} aria-hidden />}
        {saved ? "Søk lagret" : primary ? "Lagre dette søket" : "Lagre søk"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Lagre søk"
        panelClassName="w-full max-w-[420px]"
      >
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-[16px] font-medium text-ink">Lagre søket</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            Du får varsel når nye stillinger matcher. Kanaler styrer du under
            Lagrede søk.
          </p>
          <label className="mt-4 block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            Navn på søket
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              data-autofocus
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-normal normal-case tracking-normal text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-[12px] text-accent-ink">
              {error}
            </p>
          )}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-[38px] rounded-full px-4 text-[13px] text-ink-soft outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="h-[38px] rounded-full bg-ink px-5 text-[13px] font-medium text-bg outline-none transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-60"
            >
              {busy ? "Lagrer …" : "Lagre søk"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
