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
    "w-full border-b border-black/15 bg-transparent py-2 text-[14px] outline-none focus:border-ink placeholder:text-ink/40 transition-colors";
  const labelCls =
    "block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1.5";

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

  const validHex = fields.brandColor && /^#[0-9a-fA-F]{6}$/.test(fields.brandColor);

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <label className={labelCls}>Juridisk navn</label>
        <input
          className={inputCls}
          value={fields.name}
          onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className={labelCls}>Visningsnavn</label>
        <input
          className={inputCls}
          value={fields.displayName}
          onChange={(e) => setFields((f) => ({ ...f, displayName: e.target.value }))}
          required
        />
        <p className="text-[11px] text-ink/40 mt-1">Vises i sidebar og faktureringsfelt.</p>
      </div>
      <div>
        <label className={labelCls}>Logo-URL</label>
        <div className="flex items-center gap-3">
          {fields.logoUrl ? (
            <div className="w-10 h-10 rounded-lg border border-black/10 bg-black/3 flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fields.logoUrl} alt="" className="w-8 h-8 object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg border border-black/10 bg-black/3 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-ink/30">ingen</span>
            </div>
          )}
          <input
            className={inputCls}
            value={fields.logoUrl}
            onChange={(e) => setFields((f) => ({ ...f, logoUrl: e.target.value }))}
            placeholder="https://…"
            type="url"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Merkefarge</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={validHex ? fields.brandColor : "#D5592E"}
            onChange={(e) => setFields((f) => ({ ...f, brandColor: e.target.value }))}
            className="w-10 h-10 rounded-lg border border-black/15 cursor-pointer"
          />
          <input
            className={inputCls}
            value={fields.brandColor}
            onChange={(e) => setFields((f) => ({ ...f, brandColor: e.target.value }))}
            placeholder="#D5592E"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40"
        >
          {saving ? "Lagrer…" : "Lagre"}
        </button>
        {msg && (
          <span className={`text-[12px] ${msg.ok ? "text-green-700" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
