"use client";

import { useState } from "react";

type Prefill = {
  leadId: string;
  companyName: string;
  companyWebsite: string | null;
  expectedSeats: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactTitle: string;
  stage: string;
} | null;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[æø]/g, (c) => (c === "æ" ? "ae" : "o"))
    .replace(/å/g, "a")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function NewKundeForm({ prefill }: { prefill: Prefill }) {
  const [name, setName] = useState(prefill?.companyName ?? "");
  const [slug, setSlug] = useState(prefill ? slugify(prefill.companyName) : "");
  const [billingMethod, setBillingMethod] = useState<"card" | "invoice">("card");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? "").trim(),
      displayName: String(fd.get("displayName") ?? fd.get("name") ?? "").trim(),
      slug: slug.trim() || slugify(String(fd.get("name") ?? "")),
      seatLimit: Math.max(1, Number(fd.get("seatLimit") ?? 1)),
      billingMethod,
      orgNumber: billingMethod === "invoice" ? String(fd.get("orgNumber") ?? "").trim() : undefined,
      invoiceEmail: billingMethod === "invoice" ? String(fd.get("invoiceEmail") ?? "").trim() : undefined,
      leadId: prefill?.leadId,
      primaryContact: {
        name: String(fd.get("contactName") ?? "").trim() || undefined,
        email: String(fd.get("contactEmail") ?? "").trim() || undefined,
        title: String(fd.get("contactTitle") ?? "").trim() || undefined,
        phone: String(fd.get("contactPhone") ?? "").trim() || undefined,
      },
    };
    try {
      const res = await fetch("/api/sales/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Klarte ikke opprette");
      }
      const j = await res.json();
      window.location.href = j.url ?? `/selger/kunder/${j.orgId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-6">
      <fieldset className="space-y-3">
        <legend className="text-[12px] font-medium text-ink/65 uppercase tracking-wide mb-1">Bedrift</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Bedriftsnavn (legalt) *"
            name="name"
            required
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              setSlug(slugify(v));
            }}
          />
          <Field label="Visningsnavn" name="displayName" placeholder={name} />
          <Field label="Slug (URL)" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Field label="Antall lisenser" name="seatLimit" type="number" min={1} defaultValue={prefill?.expectedSeats ?? 5} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[12px] font-medium text-ink/65 uppercase tracking-wide mb-1">Faktureringsmetode</legend>
        <div className="grid grid-cols-2 gap-2">
          <RadioCard
            label="Kort / Stripe"
            description="Kunden betaler via Stripe-checkout med en gang"
            checked={billingMethod === "card"}
            onClick={() => setBillingMethod("card")}
          />
          <RadioCard
            label="Faktura"
            description="Faktura sendes til e-post, 14 dagers betalingsfrist"
            checked={billingMethod === "invoice"}
            onClick={() => setBillingMethod("invoice")}
          />
        </div>
        {billingMethod === "invoice" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Org.nr (9 siffer) *" name="orgNumber" maxLength={9} pattern="[0-9]{9}" required />
            <Field label="Faktura-epost *" name="invoiceEmail" type="email" required />
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[12px] font-medium text-ink/65 uppercase tracking-wide mb-1">Primær kontakt</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Navn" name="contactName" defaultValue={prefill?.contactName} />
          <Field label="Stilling" name="contactTitle" defaultValue={prefill?.contactTitle} />
          <Field label="E-post" name="contactEmail" type="email" defaultValue={prefill?.contactEmail} />
          <Field label="Telefon" name="contactPhone" type="tel" defaultValue={prefill?.contactPhone} />
        </div>
      </fieldset>

      {error && (
        <div className="rounded-lg bg-[var(--sales-stage-tapt)]/10 border border-[var(--sales-stage-tapt)]/30 px-3 py-2 text-[12px] text-[var(--sales-stage-tapt)]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-full bg-ink text-bg text-[13px] hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {submitting
            ? "Oppretter…"
            : billingMethod === "card"
              ? "Til Stripe-checkout →"
              : "Send faktura"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...rest
}: { label: string; name: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[11px] text-ink/65 mb-1">{label}</span>
      <input
        name={name}
        type={type}
        {...rest}
        className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60"
      />
    </label>
  );
}

function RadioCard({
  label,
  description,
  checked,
  onClick,
}: {
  label: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-left rounded-lg border px-3 py-2.5 transition-colors " +
        (checked
          ? "border-[var(--accent)] bg-[var(--accent)]/10"
          : "border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]")
      }
    >
      <div className="flex items-center gap-2 text-[12px] font-medium">
        <span
          className={
            "w-3 h-3 rounded-full border " +
            (checked
              ? "bg-[var(--accent)] border-[var(--accent)]"
              : "border-black/20 dark:border-white/20")
          }
          aria-hidden
        />
        {label}
      </div>
      <p className="text-[11px] text-ink/55 mt-1 leading-relaxed">{description}</p>
    </button>
  );
}
