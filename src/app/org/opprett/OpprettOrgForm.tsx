"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/org";

export function OpprettOrgForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
    if (!displayName) setDisplayName(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName, slug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }
      router.replace(data.url);
    } catch {
      setError("Noe gikk galt");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border-b border-black/20 bg-transparent py-2 text-[15px] outline-none focus:border-ink placeholder:text-ink/40 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          Organisasjonsnavn
        </label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Velle AS"
          required
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          Visningsnavn (vises i appen)
        </label>
        <input
          className={inputCls}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Velle"
          required
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          URL-slug
        </label>
        <div className="flex items-center gap-1 border-b border-black/20 focus-within:border-ink transition-colors">
          <span className="text-[13px] text-ink/40 shrink-0">søknadsbasen.no/org/</span>
          <input
            className="flex-1 bg-transparent py-2 text-[15px] outline-none"
            value={slug}
            onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
            placeholder="velle"
            required
            pattern="[a-z0-9-]+"
          />
        </div>
      </div>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !name || !displayName || !slug}
        className="w-full py-3 rounded-full bg-ink text-bg text-[14px] font-medium disabled:opacity-40 transition-opacity"
      >
        {loading ? "Oppretter…" : "Opprett og gå til betaling →"}
      </button>
      <p className="text-[12px] text-ink/50 text-center">
        Du vil bli sendt til Stripe for å fullføre betalingen.
      </p>
    </form>
  );
}
