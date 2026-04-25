"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SelgerDetailClient({
  profileId,
  status,
  commissionRateBp,
  monthlyQuotaCents,
}: {
  profileId: string;
  status: string;
  commissionRateBp: number;
  monthlyQuotaCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function patch(data: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/selgere/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Klarte ikke oppdatere");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  async function suspend() {
    if (!confirm("Suspendere selger? Data beholdes; selger mister tilgang.")) return;
    startTransition(async () => {
      await fetch(`/api/admin/selgere/${profileId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.06] text-[12px] hover:bg-black/[0.1] transition-colors"
      >
        Rediger
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              patch({
                commissionRateBp: Math.round(Number(fd.get("ratePct")) * 100),
                monthlyQuotaCents: Math.round(Number(fd.get("quotaKr")) * 100),
                status: String(fd.get("status")),
              });
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl space-y-3"
          >
            <h2 className="text-[14px] font-medium">Endre selger</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[11px] text-ink/65 mb-1">Provisjon (%)</span>
                <input
                  name="ratePct"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  defaultValue={(commissionRateBp / 100).toString()}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60 font-mono"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] text-ink/65 mb-1">Mnd. kvota (kr)</span>
                <input
                  name="quotaKr"
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue={(monthlyQuotaCents / 100).toString()}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60 font-mono"
                />
              </label>
            </div>
            <label className="block">
              <span className="block text-[11px] text-ink/65 mb-1">Status</span>
              <select
                name="status"
                defaultValue={status}
                className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60"
              >
                <option value="active">Aktiv</option>
                <option value="invited">Invitert</option>
                <option value="suspended">Suspendert</option>
              </select>
            </label>
            {error && (
              <div className="text-[12px] text-[var(--sales-stage-tapt)] rounded-lg bg-[var(--sales-stage-tapt)]/10 px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={suspend}
                className="text-[11px] text-[var(--sales-stage-tapt)] hover:underline"
              >
                Suspendér
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-full text-[12px] text-ink/55 hover:text-ink"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] disabled:opacity-50"
                >
                  Lagre
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
