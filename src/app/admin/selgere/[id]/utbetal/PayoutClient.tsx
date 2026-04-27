"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatNok } from "@/lib/sales/format";

type Entry = {
  id: string;
  stripeInvoiceId: string;
  orgName: string;
  invoiceAmountCents: number;
  amountCents: number;
  paidAt: string;
};

export function PayoutClient({
  profileId,
  entries,
  totalEligibleCents,
}: {
  profileId: string;
  entries: Entry[];
  totalEligibleCents: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(entries.map((e) => e.id)));
  const [paymentRef, setPaymentRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === entries.length) setSelected(new Set());
    else setSelected(new Set(entries.map((e) => e.id)));
  }

  const selectedTotal = entries
    .filter((e) => selected.has(e.id))
    .reduce((s, e) => s + e.amountCents, 0);

  async function submit() {
    if (selected.size === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/selgere/${profileId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryIds: Array.from(selected),
          paymentRef: paymentRef.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Klarte ikke registrere utbetaling");
        return;
      }
      router.push(`/admin/selgere/${profileId}`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-2xl border border-black/8 bg-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/6">
          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={selected.size === entries.length}
              onChange={toggleAll}
            />
            <span>{selected.size} av {entries.length} valgt</span>
          </label>
          <div className="text-[12px] font-mono text-ink/65">
            Total tilgjengelig: <span className="text-ink">{formatNok(totalEligibleCents)}</span>
          </div>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-ink/55 bg-black/[0.02]">
              <th className="px-4 py-2 w-8"></th>
              <th className="text-left px-4 py-2 font-medium">Kunde</th>
              <th className="text-left px-4 py-2 font-medium">Faktura</th>
              <th className="text-right px-4 py-2 font-medium">Beløp</th>
              <th className="text-right px-4 py-2 font-medium">Provisjon</th>
              <th className="text-right px-4 py-2 font-medium">Betalt</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-black/6 hover:bg-black/[0.02]">
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                </td>
                <td className="px-4 py-2.5">{e.orgName}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-ink/55 truncate max-w-[120px]">{e.stripeInvoiceId}</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatNok(e.invoiceAmountCents)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-medium">{formatNok(e.amountCents)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-ink/55">{e.paidAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-4 mt-4 rounded-2xl bg-ink text-bg shadow-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] text-bg/70 uppercase tracking-wide">Marker {selected.size} entries som utbetalt</div>
            <div className="text-[18px] font-mono font-semibold mt-0.5">Total: {formatNok(selectedTotal)}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Betalings-ref (eks: DNB lønnskjøring 2026-04-25)"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/10 text-[12px] text-bg placeholder:text-bg/45 outline-none focus:bg-white/15 min-w-[280px]"
            />
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="px-4 py-2 rounded-full bg-bg text-ink text-[13px] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {pending ? "Registrerer…" : "Bekreft utbetaling"}
            </button>
          </div>
          {error && (
            <div className="basis-full text-[11px] text-[var(--sales-stage-tapt)]">{error}</div>
          )}
        </div>
      )}
    </>
  );
}
