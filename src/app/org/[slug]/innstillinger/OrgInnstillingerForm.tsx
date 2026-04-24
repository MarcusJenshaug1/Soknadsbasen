"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Fields = {
  name: string;
  displayName: string;
  logoUrl: string | null;
  brandColor: string | null;
};

export function OrgInnstillingerForm({ slug, initial }: { slug: string; initial: Fields }) {
  const router = useRouter();
  const [fields, setFields] = useState({
    name: initial.name,
    displayName: initial.displayName,
    logoUrl: initial.logoUrl ?? "",
    brandColor: initial.brandColor ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const inputCls =
    "w-full border-b border-black/20 bg-transparent py-2 text-[15px] outline-none focus:border-ink placeholder:text-ink/40 transition-colors";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/org/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          displayName: fields.displayName,
          logoUrl: fields.logoUrl || null,
          brandColor: fields.brandColor || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMsg({ ok: false, text: data.error ?? "Noe gikk galt" });
        return;
      }
      setMsg({ ok: true, text: "Lagret" });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Noe gikk galt" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          Juridisk navn
        </label>
        <input className={inputCls} value={fields.name} onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          Visningsnavn
        </label>
        <input className={inputCls} value={fields.displayName} onChange={(e) => setFields((f) => ({ ...f, displayName: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          Logo-URL
        </label>
        <input className={inputCls} value={fields.logoUrl} onChange={(e) => setFields((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://…" type="url" />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-2">
          Merkefarge
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={fields.brandColor || "#D5592E"}
            onChange={(e) => setFields((f) => ({ ...f, brandColor: e.target.value }))}
            className="w-10 h-10 rounded-lg border border-black/20 cursor-pointer"
          />
          <input
            className="flex-1 border-b border-black/20 bg-transparent py-2 text-[15px] outline-none focus:border-ink"
            value={fields.brandColor}
            onChange={(e) => setFields((f) => ({ ...f, brandColor: e.target.value }))}
            placeholder="#D5592E"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
      </div>
      {msg && (
        <p className={`text-[13px] ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-full bg-ink text-bg text-[14px] font-medium disabled:opacity-40"
      >
        {saving ? "Lagrer…" : "Lagre innstillinger"}
      </button>
    </form>
  );
}
