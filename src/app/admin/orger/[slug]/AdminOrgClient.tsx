"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

const STATUSES = ["active", "trialing", "past_due", "canceled", "incomplete"];
const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv", trialing: "Prøve", past_due: "Forfallt", canceled: "Kansellert", incomplete: "Venter",
};

export function AdminOrgStatusEditor({ slug, current }: { slug: string; current: string }) {
  const [status, setStatus] = useState(current);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orgs/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setMsg(res.ok ? "Lagret" : "Feil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-black/15 rounded-lg px-3 py-1.5 text-[13px] bg-bg outline-none"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={saving || status === current}
        className="px-4 py-1.5 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40"
      >
        {saving ? "Lagrer…" : "Endre status"}
      </button>
      {msg && <span className="text-[12px] text-green-700">{msg}</span>}
    </div>
  );
}

export function AdminOrgBrandingEditor({
  slug,
  currentLogoUrl,
  currentBrandColor,
}: {
  slug: string;
  currentLogoUrl: string | null;
  currentBrandColor: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl ?? "");
  const [brandColor, setBrandColor] = useState(currentBrandColor ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Opplasting feilet"); return; }
      setLogoUrl(data.url);
    } catch {
      setError("Opplasting feilet");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orgs/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: logoUrl || null,
          brandColor: brandColor || null,
        }),
      });
      setMsg(res.ok ? "Lagret" : "Feil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {/* Logo */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-2">Logo</div>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadLogo(file);
          }}
        />
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-lg border border-black/10 bg-black/3 flex items-center justify-center overflow-hidden shrink-0">
              <img src={logoUrl} alt="" className="w-8 h-8 object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg border border-black/10 bg-black/3 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-ink/30">ingen</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/15 text-[12px] text-ink/60 hover:text-ink hover:border-black/30 transition-colors disabled:opacity-40"
          >
            <Upload size={12} />
            {uploading ? "Laster opp…" : "Last opp"}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={() => { setLogoUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
              className="p-1 rounded hover:bg-black/5 text-ink/40 hover:text-ink transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <input
          className="mt-2 w-full border-b border-black/15 bg-transparent py-1.5 text-[13px] outline-none focus:border-ink transition-colors placeholder:text-ink/30"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      {/* Brand color */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-2">Merkefarge</div>
        <div className="flex items-center gap-3">
          <input
            className="flex-1 border-b border-black/15 bg-transparent py-1.5 text-[13px] outline-none focus:border-ink transition-colors placeholder:text-ink/30"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            placeholder="#D5592E"
            maxLength={7}
          />
          {brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor) && (
            <div className="w-6 h-6 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: brandColor }} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={saving || uploading}
          className="px-4 py-1.5 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40"
        >
          {saving ? "Lagrer…" : "Lagre"}
        </button>
        {msg && <span className="text-[12px] text-green-700">{msg}</span>}
      </div>
    </div>
  );
}
