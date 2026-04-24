"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NyPromoForm() {
  const router = useRouter();
  const [fields, setFields] = useState({
    code: "",
    type: "percent" as "percent" | "amount",
    value: "",
    duration: "once" as "once" | "repeating" | "forever",
    durationMonths: "",
    maxRedemptions: "",
    expiresAt: "",
    appliesTo: "all" as "all" | "individual" | "org",
    firstTimeOnly: false,
    minimumAmount: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink transition-colors";
  const selectCls = "w-full border border-black/15 rounded-lg px-3 py-2 text-[14px] bg-bg outline-none focus:border-ink";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        code: fields.code,
        type: fields.type,
        value: Number(fields.value),
        duration: fields.duration,
        ...(fields.duration === "repeating" && fields.durationMonths
          ? { durationMonths: Number(fields.durationMonths) } : {}),
        ...(fields.maxRedemptions ? { maxRedemptions: Number(fields.maxRedemptions) } : {}),
        ...(fields.expiresAt ? { expiresAt: fields.expiresAt } : {}),
        appliesTo: fields.appliesTo,
        firstTimeOnly: fields.firstTimeOnly,
        ...(fields.minimumAmount ? { minimumAmount: Math.round(Number(fields.minimumAmount) * 100) } : {}),
      };
      const res = await fetch("/api/admin/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }
      router.push("/admin/promo");
    } catch {
      setError("Noe gikk galt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Kode</label>
        <input className={inputCls} value={fields.code} onChange={(e) => setFields((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="VELLE20" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Type</label>
          <select className={selectCls} value={fields.type} onChange={(e) => setFields((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
            <option value="percent">Prosent (%)</option>
            <option value="amount">Kronebeløp (kr)</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Verdi</label>
          <input className={inputCls} type="number" min="1" value={fields.value} onChange={(e) => setFields((f) => ({ ...f, value: e.target.value }))} placeholder={fields.type === "percent" ? "20" : "100"} required />
        </div>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Varighet</label>
        <select className={selectCls} value={fields.duration} onChange={(e) => setFields((f) => ({ ...f, duration: e.target.value as typeof f.duration }))}>
          <option value="once">Én gang</option>
          <option value="repeating">Gjentakende (N måneder)</option>
          <option value="forever">For alltid</option>
        </select>
      </div>
      {fields.duration === "repeating" && (
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Antall måneder</label>
          <input className={inputCls} type="number" min="1" value={fields.durationMonths} onChange={(e) => setFields((f) => ({ ...f, durationMonths: e.target.value }))} required />
        </div>
      )}
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Gjelder for</label>
        <select className={selectCls} value={fields.appliesTo} onChange={(e) => setFields((f) => ({ ...f, appliesTo: e.target.value as typeof f.appliesTo }))}>
          <option value="all">Alle produkter</option>
          <option value="individual">Kun individuelle planer</option>
          <option value="org">Kun organisasjonsplaner</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Maks innløsninger</label>
          <input className={inputCls} type="number" min="1" value={fields.maxRedemptions} onChange={(e) => setFields((f) => ({ ...f, maxRedemptions: e.target.value }))} placeholder="Ubegrenset" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Utløper</label>
          <input className={inputCls} type="date" value={fields.expiresAt} onChange={(e) => setFields((f) => ({ ...f, expiresAt: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Minstekjøp (kr)</label>
        <input className={inputCls} type="number" min="0" step="0.01" value={fields.minimumAmount} onChange={(e) => setFields((f) => ({ ...f, minimumAmount: e.target.value }))} placeholder="Ingen minimum" />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={fields.firstTimeOnly}
          onChange={(e) => setFields((f) => ({ ...f, firstTimeOnly: e.target.checked }))}
          className="w-4 h-4 rounded"
        />
        <span className="text-[14px]">Kun nye kunder (første kjøp)</span>
      </label>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-full bg-ink text-bg text-[14px] font-medium disabled:opacity-40"
      >
        {saving ? "Oppretter…" : "Opprett rabattkode"}
      </button>
    </form>
  );
}
