"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SelgereClient() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function submit(form: FormData) {
    setError(null);
    const body = {
      email: String(form.get("email") ?? "").trim(),
      name: String(form.get("name") ?? "").trim() || undefined,
      commissionRateBp: Math.round(Number(form.get("ratePct") ?? 10) * 100),
      monthlyQuotaCents: Math.round(Number(form.get("quotaKr") ?? 0) * 100),
    };
    startTransition(async () => {
      const res = await fetch("/api/admin/selgere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Klarte ikke invitere");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] hover:opacity-90 transition-opacity"
      >
        + Inviter selger
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(new FormData(e.currentTarget));
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl space-y-3"
          >
            <h2 className="text-[14px] font-medium">Inviter selger</h2>
            <p className="text-[11px] text-ink/55">
              Sender Supabase-invitasjon. Selger får tilgang umiddelbart med full Pro-tilgang.
            </p>
            <input
              name="email"
              type="email"
              required
              autoFocus
              placeholder="E-post"
              className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60"
            />
            <input
              name="name"
              placeholder="Navn (valgfri)"
              className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[11px] text-ink/65 mb-1">Provisjon (%)</span>
                <input
                  name="ratePct"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  defaultValue="10"
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
                  defaultValue="50000"
                  className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60 font-mono"
                />
              </label>
            </div>
            {error && (
              <div className="text-[12px] text-[var(--sales-stage-tapt)] rounded-lg bg-[var(--sales-stage-tapt)]/10 px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
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
                {pending ? "Inviterer…" : "Send invitasjon"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
