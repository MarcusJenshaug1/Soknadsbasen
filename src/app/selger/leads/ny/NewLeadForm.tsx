"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewLeadForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      companyName: String(fd.get("companyName") ?? "").trim(),
      title: String(fd.get("companyName") ?? "").trim(),
      companyWebsite: String(fd.get("companyWebsite") ?? "").trim() || null,
      estimatedValueCents: Math.max(0, Number(fd.get("estimatedKr") ?? 0)) * 100,
      expectedSeats: Math.max(1, Number(fd.get("expectedSeats") ?? 1)),
      stage: String(fd.get("stage") ?? "Ny"),
      notes: String(fd.get("notes") ?? "").trim() || null,
      contact: {
        name: String(fd.get("contactName") ?? "").trim() || undefined,
        email: String(fd.get("contactEmail") ?? "").trim() || undefined,
        phone: String(fd.get("contactPhone") ?? "").trim() || undefined,
        title: String(fd.get("contactTitle") ?? "").trim() || undefined,
        role: String(fd.get("contactRole") ?? "Beslutningstaker"),
      },
    };
    try {
      const res = await fetch("/api/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Klarte ikke opprette");
      }
      const j = await res.json();
      router.push(`/selger/leads/${j.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-6">
      <Section title="Bedrift">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bedriftsnavn *" name="companyName" required autoFocus />
          <Field label="Nettside" name="companyWebsite" placeholder="https://" />
          <Field label="Estimert MRR (kr)" name="estimatedKr" type="number" min={0} placeholder="0" />
          <Field label="Antall seter" name="expectedSeats" type="number" min={1} defaultValue={5} />
          <SelectField
            label="Stage"
            name="stage"
            defaultValue="Ny"
            options={["Ny", "Kontaktet", "Demo booket", "Tilbud sendt", "Forhandling"]}
          />
        </div>
        <Textarea label="Notater" name="notes" rows={3} placeholder="Bakgrunn, behov, smertepunkter…" />
      </Section>

      <Section title="Primær kontakt (valgfri)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Navn" name="contactName" />
          <Field label="Stilling" name="contactTitle" />
          <Field label="E-post" name="contactEmail" type="email" />
          <Field label="Telefon" name="contactPhone" type="tel" />
          <SelectField
            label="Rolle"
            name="contactRole"
            defaultValue="Beslutningstaker"
            options={["Beslutningstaker", "Bruker", "Champion"]}
          />
        </div>
      </Section>

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
          {submitting ? "Oppretter…" : "Opprett lead"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[12px] font-medium text-ink/65 uppercase tracking-wide mb-1">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
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

function Textarea({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="block text-[11px] text-ink/65 mb-1">{label}</span>
      <textarea
        name={name}
        {...rest}
        className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60 resize-y"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-ink/65 mb-1">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[13px] outline-none focus:border-[var(--accent)]/60"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
