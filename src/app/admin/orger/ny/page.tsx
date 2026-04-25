"use client";

import Link from "next/link";
import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, X } from "lucide-react";

function toSlugClient(name: string) {
  return name
    .toLowerCase().trim()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 50);
}

function NyOrgForm() {
  const router = useRouter();
  const search = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const prefillEmail = search.get("email") ?? "";
  const prefillOrg = search.get("org") ?? "";
  const [fields, setFields] = useState({
    displayName: prefillOrg,
    name: prefillOrg,
    slug: toSlugClient(prefillOrg),
    orgNumber: "",
    adminEmail: prefillEmail,
    status: "active",
    logoUrl: "",
    brandColor: "",
  });
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string) {
    setFields((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !slugManual) {
        next.slug = toSlugClient(value);
      }
      return next;
    });
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Opplasting feilet"); return; }
      set("logoUrl", data.url);
    } catch {
      setError("Opplasting feilet");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          displayName: fields.displayName,
          slug: fields.slug || undefined,
          orgNumber: fields.orgNumber || undefined,
          adminEmail: fields.adminEmail,
          status: fields.status,
          logoUrl: fields.logoUrl || undefined,
          brandColor: fields.brandColor || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }
      router.push(`/admin/orger/${data.slug}`);
    } catch {
      setError("Noe gikk galt");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink transition-colors placeholder:text-ink/30";
  const sel = "w-full border border-black/15 rounded-lg px-3 py-2 text-[14px] bg-bg outline-none focus:border-ink";

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/orger" className="text-[13px] text-ink/50 hover:text-ink">← Organisasjoner</Link>
      </div>
      <h1 className="text-[22px] font-semibold mb-8">Ny organisasjon</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Visningsnavn</label>
          <input className={inp} value={fields.displayName} onChange={(e) => set("displayName", e.target.value)} placeholder="Velle AS" required />
          <p className="text-[11px] text-ink/40 mt-1">Vises i whitelabeled header for brukerne</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Internt navn</label>
          <input className={inp} value={fields.name} onChange={(e) => set("name", e.target.value)} placeholder="velle-as" required />
          <p className="text-[11px] text-ink/40 mt-1">Juridisk/internt navn</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Organisasjonsnummer (valgfritt)</label>
          <input className={inp} value={fields.orgNumber} onChange={(e) => set("orgNumber", e.target.value)} placeholder="989 645 917" />
          <p className="text-[11px] text-ink/40 mt-1">9-siffer norsk organisasjonsnummer</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Slug (URL)</label>
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-ink/40">/org/</span>
            <input
              className={`${inp} flex-1`}
              value={fields.slug}
              onChange={(e) => { setSlugManual(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
              placeholder="velle-as"
              required
              pattern="[a-z0-9-]+"
            />
          </div>
          <p className="text-[11px] text-ink/40 mt-1">Auto-generert fra internt navn</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Admin-bruker (e-post)</label>
          <input className={inp} type="email" value={fields.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} placeholder="admin@velle.no" required />
          <p className="text-[11px] text-ink/40 mt-1">Inviteres automatisk om de ikke har konto ennå</p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Status</label>
          <select className={sel} value={fields.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Aktiv</option>
            <option value="trialing">Prøveperiode</option>
            <option value="incomplete">Venter (ikke aktiv)</option>
          </select>
        </div>

        <div className="border-t border-black/8 pt-6 space-y-6">
          <p className="text-[11px] uppercase tracking-wide text-ink/40 font-medium">Whitelabeling (valgfritt)</p>

          {/* Logo upload */}
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-2">Logo</label>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            {fields.logoUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg border border-black/10 bg-black/3 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={fields.logoUrl} alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-ink/60 truncate">{fields.logoUrl.split("/").pop()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { set("logoUrl", ""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="p-1 rounded hover:bg-black/5 text-ink/40 hover:text-ink transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/15 text-[13px] text-ink/60 hover:text-ink hover:border-black/30 transition-colors disabled:opacity-40"
              >
                <Upload size={14} />
                {uploading ? "Laster opp…" : "Last opp logo (SVG, PNG)"}
              </button>
            )}
            <p className="text-[11px] text-ink/40 mt-1">Eller lim inn URL nedenfor</p>
            <input
              className={`${inp} mt-1`}
              type="url"
              value={fields.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://velle.no/logo.png"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Merkefarge (hex)</label>
            <div className="flex items-center gap-3">
              <input className={`${inp} flex-1`} value={fields.brandColor} onChange={(e) => set("brandColor", e.target.value)} placeholder="#D5592E" maxLength={7} />
              {fields.brandColor && /^#[0-9a-fA-F]{6}$/.test(fields.brandColor) && (
                <div className="w-7 h-7 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: fields.brandColor }} />
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full py-3 rounded-full bg-ink text-bg text-[14px] font-medium disabled:opacity-40 transition-opacity"
        >
          {saving ? "Oppretter…" : "Opprett organisasjon"}
        </button>
      </form>
    </div>
  );
}

export default function NyOrgPage() {
  return (
    <Suspense fallback={null}>
      <NyOrgForm />
    </Suspense>
  );
}
