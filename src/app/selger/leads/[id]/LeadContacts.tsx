"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Contact = {
  linkId: string;
  role: string;
  isPrimary: boolean;
  contact: {
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
  };
};

const ROLE_BG: Record<string, string> = {
  Beslutningstaker: "bg-[var(--sales-stage-kontaktet)]/15 text-[var(--sales-stage-kontaktet)]",
  Champion: "bg-[var(--sales-commission-eligible)]/15 text-[var(--sales-commission-eligible)]",
  Bruker: "bg-black/[0.06] dark:bg-white/[0.08] text-ink/65",
};

export function LeadContacts({
  leadId,
  initial,
}: {
  leadId: string;
  initial: Contact[];
}) {
  const [contacts, setContacts] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function addContact(form: FormData) {
    const body = {
      name: String(form.get("name") ?? "").trim(),
      title: String(form.get("title") ?? "").trim() || undefined,
      email: String(form.get("email") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
      role: String(form.get("role") ?? "Bruker"),
      isPrimary: form.get("isPrimary") === "on",
    };
    if (!body.name) return;
    startTransition(async () => {
      const res = await fetch(`/api/sales/leads/${leadId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert("Klarte ikke legge til kontakt.");
        return;
      }
      router.refresh();
      setShowForm(false);
    });
  }

  async function removeContact(linkId: string) {
    if (!confirm("Fjerne kontakt fra leaden?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/sales/leads/${leadId}/contacts?linkId=${linkId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Klarte ikke fjerne.");
        return;
      }
      setContacts((prev) => prev.filter((c) => c.linkId !== linkId));
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-medium">Kontakter</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="w-6 h-6 rounded-full bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] text-[14px] leading-none transition-colors"
          aria-label="Legg til kontakt"
        >
          +
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addContact(new FormData(e.currentTarget));
          }}
          className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] p-3 mb-3 space-y-2"
        >
          <input
            name="name"
            required
            placeholder="Navn *"
            className="w-full px-2.5 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="title"
              placeholder="Stilling"
              className="px-2.5 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
            />
            <select
              name="role"
              defaultValue="Bruker"
              className="px-2.5 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
            >
              <option>Beslutningstaker</option>
              <option>Bruker</option>
              <option>Champion</option>
            </select>
            <input
              name="email"
              type="email"
              placeholder="E-post"
              className="px-2.5 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
            />
            <input
              name="phone"
              type="tel"
              placeholder="Telefon"
              className="px-2.5 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-ink/65">
            <input type="checkbox" name="isPrimary" /> Primær kontakt
          </label>
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-2.5 py-1 rounded-full text-[11px] text-ink/55 hover:text-ink"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-2.5 py-1 rounded-full bg-ink text-bg text-[11px] disabled:opacity-50"
            >
              Legg til
            </button>
          </div>
        </form>
      )}

      {contacts.length === 0 && !showForm && (
        <p className="text-[12px] text-ink/55 text-center py-3">Ingen kontakter ennå.</p>
      )}

      <ul className="space-y-2">
        {contacts.map((cl) => (
          <li
            key={cl.linkId}
            className="group flex items-start gap-2.5 rounded-lg p-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
          >
            <span
              className={
                "w-7 h-7 rounded-full text-[11px] font-medium flex items-center justify-center shrink-0 " +
                (ROLE_BG[cl.role] ?? ROLE_BG.Bruker)
              }
              aria-hidden
            >
              {cl.contact.name
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium truncate">{cl.contact.name}</span>
                {cl.isPrimary && (
                  <span className="text-[9px] uppercase tracking-wide text-[var(--accent)] font-mono">primær</span>
                )}
              </div>
              <div className="text-[10px] text-ink/55 truncate">
                {[cl.contact.title, cl.role].filter(Boolean).join(" · ")}
              </div>
              {(cl.contact.email || cl.contact.phone) && (
                <div className="text-[10px] text-ink/65 truncate font-mono">
                  {cl.contact.email}
                  {cl.contact.email && cl.contact.phone ? " · " : ""}
                  {cl.contact.phone}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeContact(cl.linkId)}
              className="text-[10px] text-ink/35 hover:text-[var(--sales-stage-tapt)] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Fjern
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
