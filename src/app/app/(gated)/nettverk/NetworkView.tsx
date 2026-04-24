"use client";

import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { SectionLabel } from "@/components/ui/Pill";
import { IconClose, IconLink, IconMail, IconPlus } from "@/components/ui/Icons";
import { AvatarCropper } from "@/components/AvatarCropper";
import { cn } from "@/lib/cn";

export type Contact = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  notes: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  _count: { applications: number };
};

type FormState = {
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  email: string;
  phone: string;
  photoUrl: string;
  notes: string;
  lastContactedAt: string;
};

type Grouping = "none" | "letter" | "company";

const EMPTY_FORM: FormState = {
  name: "",
  title: "",
  company: "",
  linkedinUrl: "",
  email: "",
  phone: "",
  photoUrl: "",
  notes: "",
  lastContactedAt: "",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ContactAvatar({ contact, size = 40 }: { contact: Contact; size?: number }) {
  const initials = contact.name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (contact.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.photoUrl}
        alt={contact.name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-panel flex items-center justify-center text-[13px] font-medium shrink-0 text-ink/70"
    >
      {initials}
    </div>
  );
}

function ContactCard({
  contact,
  onEdit,
}: {
  contact: Contact;
  onEdit: (c: Contact) => void;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 p-5 flex flex-col gap-3 relative group">
      <button
        onClick={() => onEdit(contact)}
        className="absolute top-3 right-3 text-[11px] text-ink/35 hover:text-ink transition-colors opacity-0 group-hover:opacity-100"
      >
        Rediger
      </button>

      <div className="flex items-center gap-3 pr-12">
        <ContactAvatar contact={contact} />
        <div className="min-w-0">
          <div className="text-[14px] font-medium leading-tight truncate">{contact.name}</div>
          {(contact.title || contact.company) && (
            <div className="text-[12px] text-ink/55 truncate mt-0.5">
              {[contact.title, contact.company].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-[12px] text-ink/60 hover:text-accent transition-colors"
          >
            <IconMail size={13} />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.linkedinUrl && (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[12px] text-ink/60 hover:text-accent transition-colors"
          >
            <IconLink size={13} />
            <span className="truncate">LinkedIn</span>
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-2 text-[12px] text-ink/60 hover:text-ink transition-colors"
          >
            <span className="text-[11px] opacity-50">📞</span>
            <span className="truncate">{contact.phone}</span>
          </a>
        )}
      </div>

      {contact.notes && (
        <p className="text-[12px] text-ink/60 border-t border-black/5 dark:border-white/5 pt-3 line-clamp-2">
          {contact.notes}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3 mt-auto">
        <span className="text-[11px] text-ink/40">
          {contact._count.applications > 0
            ? `${contact._count.applications} søknad${contact._count.applications === 1 ? "" : "er"}`
            : "Ingen søknader"}
        </span>
        {contact.lastContactedAt && (
          <span className="text-[11px] text-ink/40">
            Kontaktet {formatDate(contact.lastContactedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function ContactModal({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Contact | null;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  onDelete?: (id: string) => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          title: initial.title ?? "",
          company: initial.company ?? "",
          linkedinUrl: initial.linkedinUrl ?? "",
          email: initial.email ?? "",
          phone: initial.phone ?? "",
          photoUrl: initial.photoUrl ?? "",
          notes: initial.notes ?? "",
          lastContactedAt: initial.lastContactedAt
            ? new Date(initial.lastContactedAt).toISOString().slice(0, 10)
            : "",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoFile(file: File) {
    setCropFile(file);
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Navn er påkrevd"); return; }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        title: form.title || null,
        company: form.company || null,
        linkedinUrl: form.linkedinUrl || null,
        email: form.email || null,
        phone: form.phone || null,
        photoUrl: form.photoUrl || null,
        notes: form.notes || null,
        lastContactedAt: form.lastContactedAt || null,
      };

      const res = await fetch(
        initial ? `/api/contacts/${initial.id}` : "/api/contacts",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json() as Contact;
      onSave(saved);
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial || !onDelete) return;
    setSaving(true);
    try {
      await fetch(`/api/contacts/${initial.id}`, { method: "DELETE" });
      onDelete(initial.id);
    } finally {
      setSaving(false);
    }
  }

  const textFields: { key: keyof FormState; label: string; placeholder: string; type?: string }[] = [
    { key: "name", label: "Navn *", placeholder: "Kari Nordmann" },
    { key: "title", label: "Stilling", placeholder: "Engineering Manager" },
    { key: "company", label: "Selskap", placeholder: "Bekk" },
    { key: "email", label: "E-post", placeholder: "kari@bekk.no", type: "email" },
    { key: "phone", label: "Telefon", placeholder: "+47 999 00 000", type: "tel" },
    { key: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/kari" },
    { key: "lastContactedAt", label: "Sist kontaktet", placeholder: "", type: "date" },
  ];

  return createPortal(
    <>
    <AvatarCropper
      file={cropFile}
      onCancel={() => setCropFile(null)}
      onConfirm={async (blob) => {
        setCropFile(null);
        const base64 = await blobToBase64(blob);
        set("photoUrl", base64);
      }}
    />
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-bg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/8 dark:border-white/8">
          <h2 className="text-[16px] font-medium">
            {initial ? "Rediger kontakt" : "Ny kontakt"}
          </h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <IconClose size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Photo upload */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-ink/55 block mb-2">
              Profilbilde
            </label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-panel flex items-center justify-center overflow-hidden shrink-0">
                {form.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photoUrl} alt="Profilbilde" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] text-ink/40">Foto</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors"
                >
                  {form.photoUrl ? "Bytt bilde" : "Last opp"}
                </button>
                {form.photoUrl && (
                  <button
                    type="button"
                    onClick={() => set("photoUrl", "")}
                    className="px-3 py-1.5 rounded-full border border-black/15 dark:border-white/15 text-[12px] text-ink/60 hover:text-ink transition-colors"
                  >
                    Fjern
                  </button>
                )}
              </div>
            </div>
          </div>

          {textFields.map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-[11px] uppercase tracking-wider text-ink/55 block mb-1">
                {label}
              </label>
              <input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 text-[13px] focus:outline-none focus:border-accent bg-surface text-ink"
              />
            </div>
          ))}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-ink/55 block mb-1">
              Notater
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Møtte på karrieremesse, hjelp med intro til team …"
              className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 text-[13px] resize-none focus:outline-none focus:border-accent bg-surface text-ink"
            />
          </div>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-black/8 dark:border-white/8 flex items-center justify-between gap-3">
          {initial && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="text-[12px] text-ink/40 hover:text-red-600 transition-colors"
            >
              Slett
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-[12px] hover:bg-black/5 dark:hover:bg-white/5 text-ink"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-full bg-ink text-bg text-[12px] font-medium hover:bg-[#2a2522] dark:hover:bg-[#3a332d] disabled:opacity-50"
            >
              {saving ? "Lagrer …" : initial ? "Lagre endringer" : "Legg til"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>,
    document.body,
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="col-span-full flex items-center gap-3 pt-2 pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/40 min-w-[1.5rem]">
        {label}
      </span>
      <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
    </div>
  );
}

function GroupingToggle({ value, onChange }: { value: Grouping; onChange: (g: Grouping) => void }) {
  const options: { value: Grouping; label: string }[] = [
    { value: "none", label: "Alle" },
    { value: "letter", label: "A–Å" },
    { value: "company", label: "Selskap" },
  ];
  return (
    <div className="inline-flex bg-panel rounded-full p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-[12px] transition-colors",
            value === o.value
              ? "bg-bg text-ink font-medium"
              : "text-ink/55 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function buildGroups(contacts: Contact[], grouping: Grouping): { label: string; items: Contact[] }[] {
  if (grouping === "none") return [{ label: "", items: contacts }];

  const map = new Map<string, Contact[]>();

  for (const c of contacts) {
    const key =
      grouping === "letter"
        ? (c.name[0]?.toUpperCase() ?? "#")
        : (c.company?.trim() || "Uten selskap");

    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }

  return [...map.entries()]
    .sort(([a], [b]) => {
      if (grouping === "letter") {
        if (a === "#") return 1;
        if (b === "#") return -1;
      } else {
        if (a === "Uten selskap") return 1;
        if (b === "Uten selskap") return -1;
      }
      return a.localeCompare(b, "nb");
    })
    .map(([label, items]) => ({ label, items }));
}

export function NetworkView({ initial }: { initial: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [search, setSearch] = useState("");
  const [grouping, setGrouping] = useState<Grouping>("none");
  const [modal, setModal] = useState<"new" | Contact | null>(null);

  const handleSave = useCallback((saved: Contact) => {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next.sort((a, b) => a.name.localeCompare(b.name, "nb"));
      }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name, "nb"));
    });
    setModal(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setModal(null);
  }, []);

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q)
    );
  });

  const groups = buildGroups(filtered, grouping);

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <SectionLabel className="mb-3">Nettverk</SectionLabel>
          <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
            {contacts.length === 0
              ? "Ingen kontakter ennå."
              : `${contacts.length} kontakt${contacts.length === 1 ? "" : "er"}`}
          </h1>
          {contacts.length > 0 && (
            <p className="text-[14px] text-ink/60 mt-2">
              Hold orden på folk som kan hjelpe deg videre.
            </p>
          )}
        </div>
        <button
          onClick={() => setModal("new")}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors"
        >
          <IconPlus size={14} />
          <span className="hidden sm:inline">Ny kontakt</span>
          <span className="sm:hidden">Ny</span>
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="max-w-md">
          <p className="text-[14px] text-ink/60 mb-6">
            Legg til folk du kjenner i bransjen. Hvem hjalp deg med en intro? Hvem
            bør du følge opp etter nettverksarrangementet?
          </p>
          <button
            onClick={() => setModal("new")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830]"
          >
            <IconPlus size={14} />
            Legg til første kontakt
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {contacts.length >= 5 && (
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søk etter navn, selskap …"
                className="w-full max-w-xs px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-[13px] focus:outline-none focus:border-accent bg-surface text-ink"
              />
            )}
            {contacts.length >= 3 && (
              <GroupingToggle value={grouping} onChange={setGrouping} />
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="text-[13px] text-ink/50">Ingen treff for &ldquo;{search}&rdquo;</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.map(({ label, items }) => (
                <div key={label || "__all__"} className="contents">
                  {label && <GroupHeader label={label} />}
                  {items.map((c) => (
                    <ContactCard
                      key={c.id}
                      contact={c}
                      onEdit={(contact) => setModal(contact)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modal !== null && (
        <ContactModal
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
