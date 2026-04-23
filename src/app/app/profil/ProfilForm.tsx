"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { SectionLabel } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: Date | string;
};

function initials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0];
  return source
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfilForm({ initialUser }: { initialUser: User }) {
  const router = useRouter();
  const setStoreUser = useAuthStore((s) => s.setUser);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(initialUser.name ?? "");
  const [email, setEmail] = useState(initialUser.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialUser.avatarUrl ?? null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke lagre");
      setMsg({ kind: "ok", text: data.message ?? "Lagret" });
      setStoreUser({
        id: initialUser.id,
        email: data.user.email,
        name: data.user.name,
        avatarUrl,
      });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Ukjent feil" });
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarSelected(file: File) {
    setUploadingAvatar(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/user/profile", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Opplasting feilet");
      setAvatarUrl(data.user.avatarUrl);
      await refreshProfile();
      setMsg({ kind: "ok", text: "Profilbilde oppdatert" });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Ukjent feil" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Kunne ikke slette");
      }
      setAvatarUrl(null);
      await refreshProfile();
      setMsg({ kind: "ok", text: "Profilbilde fjernet" });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Ukjent feil" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPw.length < 8) {
      setMsg({ kind: "err", text: "Passordet må være minst 8 tegn." });
      return;
    }
    if (newPw !== confirmPw) {
      setMsg({ kind: "err", text: "Passordene stemmer ikke." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke endre passord");
      setMsg({ kind: "ok", text: "Passord oppdatert" });
      setNewPw("");
      setConfirmPw("");
      setPwOpen(false);
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Ukjent feil" });
    } finally {
      setSaving(false);
    }
  }

  function onExport() {
    window.location.href = "/api/user/export";
  }

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke slette konto");
      await logout();
      router.replace("/");
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Ukjent feil" });
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-10 py-6 md:py-10">
      <SectionLabel className="mb-3">Innstillinger</SectionLabel>
      <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-10">
        Profilen din
      </h1>

      {msg && (
        <div
          className={cn(
            "mb-6 px-4 py-2.5 rounded-2xl text-[12px]",
            msg.kind === "ok"
              ? "bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/30"
              : "bg-[#c15a3a]/10 text-[#c15a3a] border border-[#c15a3a]/30",
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="space-y-10">
        {/* Identity */}
        <Section
          title="Identitet"
          subtitle="Kontaktinfo som vises på CV og søknader."
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-[#eee9df] flex items-center justify-center text-[24px] font-medium text-[#14110e]/70 overflow-hidden shrink-0">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={name || initialUser.email}
                  width={80}
                  height={80}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(name || initialUser.name, email)
              )}
            </div>
            <div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAvatarSelected(f);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 rounded-full bg-[#14110e] text-[#faf8f5] text-[12px] font-medium hover:bg-[#c15a3a] disabled:opacity-50 transition-colors"
                >
                  {uploadingAvatar
                    ? "Laster opp …"
                    : avatarUrl
                      ? "Bytt bilde"
                      : "Last opp bilde"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 rounded-full border border-black/15 text-[12px] hover:border-black/30 disabled:opacity-50 transition-colors"
                  >
                    Fjern
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#14110e]/50 mt-2">
                JPG/PNG/WEBP · maks 2 MB.
              </p>
            </div>
          </div>
          <form onSubmit={onSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Navn" value={name} onChange={setName} />
            <Field
              label="E-post"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a] transition-colors disabled:opacity-50"
              >
                {saving ? "Lagrer…" : "Lagre endringer"}
              </button>
            </div>
          </form>
        </Section>

        {/* Konto */}
        <Section title="Konto" subtitle="Passord og innlogging.">
          <div className="space-y-4">
            <Field label="Innloggings-epost" value={initialUser.email} disabled />
            {!pwOpen ? (
              <button
                type="button"
                onClick={() => setPwOpen(true)}
                className="text-[13px] text-[#c15a3a] hover:text-[#14110e]"
              >
                Endre passord →
              </button>
            ) : (
              <form
                onSubmit={onChangePassword}
                className="space-y-4 p-5 rounded-2xl bg-[#eee9df]/50"
              >
                <Field
                  label="Nytt passord"
                  type="password"
                  value={newPw}
                  onChange={setNewPw}
                  autoComplete="new-password"
                />
                <Field
                  label="Bekreft passord"
                  type="password"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  autoComplete="new-password"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPwOpen(false);
                      setNewPw("");
                      setConfirmPw("");
                    }}
                    className="px-4 py-2 rounded-full border border-black/15 text-[12px] hover:border-black/30"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-full bg-[#14110e] text-[#faf8f5] text-[12px] font-medium hover:bg-[#c15a3a] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Lagrer…" : "Oppdater passord"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Section>

        {/* Data */}
        <Section title="Data" subtitle="Eksport og sletting — du eier det hele.">
          <div className="space-y-2.5">
            <Row
              title="Last ned mine data"
              sub="JSON-eksport av alt innhold — CV-er, søknader, brev."
              action="Eksporter"
              onClick={onExport}
            />
            {!deleteOpen ? (
              <Row
                title="Slett konto"
                sub="Permanent. Kan ikke angres."
                action="Slett"
                danger
                onClick={() => setDeleteOpen(true)}
              />
            ) : (
              <form
                onSubmit={onDelete}
                className="p-5 rounded-2xl border border-[#c15a3a]/30 bg-[#c15a3a]/5 space-y-4"
              >
                <div>
                  <h3 className="text-[14px] font-medium text-[#c15a3a] mb-1">
                    Bekreft sletting
                  </h3>
                  <p className="text-[12px] text-[#14110e]/65">
                    Skriv inn passordet ditt for å bekrefte. Alt av søknader,
                    CV-er og brev blir fjernet permanent.
                  </p>
                </div>
                <Field
                  label="Passord"
                  type="password"
                  value={deletePw}
                  onChange={setDeletePw}
                  autoComplete="current-password"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeletePw("");
                    }}
                    className="px-4 py-2 rounded-full border border-black/15 text-[12px] hover:border-black/30"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={deleting || !deletePw}
                    className="px-5 py-2 rounded-full bg-[#c15a3a] text-[#faf8f5] text-[12px] font-medium hover:bg-[#a34a2f] transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Sletter…" : "Slett konto permanent"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Section>

        <Section title="Økt" subtitle="Logg ut fra denne enheten.">
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
            className="px-5 py-2.5 rounded-full border border-black/15 text-[13px] hover:border-black/30 transition-colors"
          >
            Logg ut
          </button>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pb-10 border-b border-black/8 last:border-0">
      <div className="mb-6">
        <h2 className="text-[20px] md:text-[22px] tracking-tight font-medium mb-1">
          {title}
        </h2>
        <p className="text-[13px] text-[#14110e]/60">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#c15a3a]",
          disabled && "bg-[#eee9df]/40 text-[#14110e]/60 cursor-not-allowed",
        )}
      />
    </div>
  );
}

function Row({
  title,
  sub,
  action,
  danger = false,
  onClick,
}: {
  title: string;
  sub: string;
  action: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-5 rounded-2xl border",
        danger
          ? "border-[#c15a3a]/30 bg-[#c15a3a]/5"
          : "border-black/8 bg-white",
      )}
    >
      <div className="min-w-0">
        <div
          className={cn(
            "text-[14px] font-medium",
            danger && "text-[#c15a3a]",
          )}
        >
          {title}
        </div>
        <div className="text-[12px] text-[#14110e]/55 mt-0.5">{sub}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "shrink-0 px-4 py-2 rounded-full text-[12px] font-medium transition-colors",
          danger
            ? "bg-[#c15a3a] text-[#faf8f5] hover:bg-[#a34a2f]"
            : "bg-[#14110e] text-[#faf8f5] hover:bg-[#c15a3a]",
        )}
      >
        {action}
      </button>
    </div>
  );
}
