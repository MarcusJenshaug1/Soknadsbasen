"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import {
  PasswordStrength,
  passwordScore,
} from "@/components/ui/PasswordStrength";
import { OrgRegistrationForm } from "@/components/auth/OrgRegistrationForm";
import { cn } from "@/lib/cn";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";

type Mode = "login" | "register";
type RegisterType = "personal" | "org";

const underline =
  "w-full bg-transparent border-b border-black/15 dark:border-white/15 focus:border-accent py-2.5 outline-none text-[15px]";
const primary =
  "w-full py-3.5 mt-4 rounded-full bg-accent text-bg text-[14px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors disabled:opacity-50";
const label =
  "text-[11px] uppercase tracking-wider text-[#14110e]/55 dark:text-[#f0ece6]/55 block mb-2";

/**
 * Single-column auth screen with a toggle between login and register.
 * `focus` sets the initial mode; URL stays on the route the user navigated to.
 */
export function AuthSplit({ focus }: { focus: Mode }) {
  const [mode, setMode] = useState<Mode>(focus);

  return (
    <div className="min-h-dvh bg-bg text-ink flex flex-col">
      <header className="max-w-[560px] mx-auto w-full px-6 md:px-10 pt-6 md:pt-10 flex items-center justify-between">
        <Logo href="/" />
        {mode === "register" && (
          <SectionLabel tone="accent">7 dager gratis</SectionLabel>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center px-6 md:px-10 py-12">
        <div className="w-full max-w-[400px]">
          <Toggle mode={mode} setMode={setMode} />
          <div className="mt-10">
            {mode === "login" ? (
              <LoginForm />
            ) : (
              <RegisterForm onDone={() => setMode("login")} />
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-[560px] mx-auto w-full px-6 md:px-10 pb-6 md:pb-8 text-center text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45">
        {mode === "login" ? (
          <>
            Ny her?{" "}
            <button
              onClick={() => setMode("register")}
              className="text-accent hover:text-ink underline-offset-2 hover:underline"
            >
              Opprett konto
            </button>
          </>
        ) : (
          <>
            Har du allerede konto?{" "}
            <button
              onClick={() => setMode("login")}
              className="text-accent hover:text-ink underline-offset-2 hover:underline"
            >
              Logg inn
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function Toggle({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Logg inn eller registrer"
      className="inline-flex bg-panel rounded-full p-1 w-full"
    >
      {(["login", "register"] as const).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => setMode(m)}
          className={cn(
            "flex-1 py-2 rounded-full text-[12px] uppercase tracking-[0.12em] transition-colors",
            mode === m
              ? "bg-bg text-ink font-medium"
              : "text-[#14110e]/60 dark:text-[#f0ece6]/60 hover:text-ink",
          )}
        >
          {m === "login" ? "Logg inn" : "Registrer"}
        </button>
      ))}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Kunne ikke logge inn");
      return;
    }
    const redirect = search.get("redirect") || "/app";
    router.replace(redirect);
  }

  return (
    <div>
      <SectionLabel className="mb-4">Logg inn</SectionLabel>
      <h1 className="text-[36px] md:text-[40px] leading-[1] tracking-[-0.03em] font-medium mb-3">
        Velkommen tilbake.
      </h1>
      <p className="text-[14px] text-[#14110e]/65 dark:text-[#f0ece6]/65 mb-8">
        Fortsett der du slapp.
      </p>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={label}>E-post</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={underline}
          />
        </div>
        <div>
          <label className={label}>Passord</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={underline}
          />
        </div>
        {error && <p className="text-[12px] text-accent">{error}</p>}
        <button type="submit" disabled={submitting} className={primary}>
          {submitting ? "Logger inn…" : "Logg inn"}
        </button>
        <div className="text-right">
          <Link
            href="/glemt-passord"
            className="text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60 hover:text-accent"
          >
            Glemt passord?
          </Link>
        </div>
      </form>
    </div>
  );
}

function OrgInquiryForm({
  defaultEmail,
  defaultName,
  onClose,
}: {
  defaultEmail: string;
  defaultName: string;
  onClose: () => void;
}) {
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState(defaultName);
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErr(null);
    try {
      const res = await fetch("/api/org/forespørsel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, contactName, contactEmail, message }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Noe gikk galt"); return; }
      setSent(true);
    } catch {
      setErr("Noe gikk galt");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40 px-5 py-4">
        <p className="text-[13px] font-medium text-green-800 dark:text-green-300">Forespørsel sendt!</p>
        <p className="text-[12px] text-green-700/70 dark:text-green-400/70 mt-0.5">Vi tar kontakt med deg snart.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-panel px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-ink/50" />
          <span className="text-[13px] font-medium">Søk om org-tilgang</span>
        </div>
        <button type="button" onClick={onClose} className="text-[11px] text-ink/40 hover:text-ink transition-colors">lukk</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={label}>Organisasjonsnavn</label>
          <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Velle AS" className={underline} />
        </div>
        <div>
          <label className={label}>Kontaktperson</label>
          <input required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Marit Larsen" className={underline} />
        </div>
        <div>
          <label className={label}>E-post</label>
          <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="navn@org.no" className={underline} />
        </div>
        <div>
          <label className={label}>Melding (valgfritt)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Fortell litt om organisasjonen og hva dere trenger…"
            rows={2}
            className={`${underline} resize-none`}
          />
        </div>
        {err && <p className="text-[12px] text-accent">{err}</p>}
        <button type="submit" disabled={sending} className="w-full py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40 transition-opacity">
          {sending ? "Sender…" : "Send forespørsel"}
        </button>
      </form>
    </div>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [registerType, setRegisterType] = useState<RegisterType>("personal");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const score = passwordScore(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Passordet må være minst 8 tegn.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await register(email, password, name);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Kunne ikke opprette konto");
      return;
    }
    // Supabase may require email confirmation; if no session yet, surface
    // that to the user via the login toggle.
    if (!useAuthStore.getState().user) {
      onDone();
      return;
    }
    router.replace("/velkommen");
  }

  return (
    <div>
      <div className="mb-8 flex gap-3">
        <button
          type="button"
          onClick={() => setRegisterType("personal" as const)}
          className={`flex-1 py-2.5 px-4 rounded-full font-medium text-[13px] uppercase tracking-wider transition-colors ${
            registerType === "personal"
              ? "bg-accent text-bg hover:bg-[#a94424] dark:hover:bg-[#c45830]"
              : "bg-panel text-[#14110e]/60 dark:text-[#f0ece6]/60 hover:bg-panel/80"
          }`}
        >
          Privatperson
        </button>
        <button
          type="button"
          onClick={() => setRegisterType("org" as const)}
          className={`flex-1 py-2.5 px-4 rounded-full font-medium text-[13px] uppercase tracking-wider transition-colors ${
            registerType === "org"
              ? "bg-accent text-bg hover:bg-[#a94424] dark:hover:bg-[#c45830]"
              : "bg-panel text-[#14110e]/60 dark:text-[#f0ece6]/60 hover:bg-panel/80"
          }`}
        >
          Organisasjon
        </button>
      </div>

      {registerType === "org" ? (
        <OrgRegistrationForm />
      ) : (
        <>
          <SectionLabel className="mb-4">Ny her</SectionLabel>
      <h1 className="text-[36px] md:text-[40px] leading-[1] tracking-[-0.03em] font-medium mb-3">
        Opprett basen din.
      </h1>
      <p className="text-[14px] text-[#14110e]/65 dark:text-[#f0ece6]/65 mb-8">
        Tre felt. Så er du i gang med 7 dager gratis.
      </p>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={label}>Navn</label>
          <input
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marit Larsen"
            className={underline}
          />
        </div>
        <div>
          <label className={label}>E-post</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="navn@epost.no"
            className={underline}
          />
        </div>
        <div>
          <label className={label}>Passord</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minst 8 tegn"
            className={underline}
          />
          <PasswordStrength score={score} />
        </div>
        {error && <p className="text-[12px] text-accent">{error}</p>}
        <button type="submit" disabled={submitting} className={primary}>
          {submitting ? "Oppretter…" : "Opprett konto"}
        </button>
        <p className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 leading-relaxed pt-1">
          Ved registrering godtar du våre vilkår og personvernerklæring.
        </p>
      </form>

      <div className="mt-8 pt-6 border-t border-black/8 dark:border-white/8">
        {!orgOpen ? (
          <button
            type="button"
            onClick={() => setOrgOpen(true)}
            className="flex items-center gap-2 text-[13px] text-ink/45 hover:text-ink transition-colors group w-full"
          >
            <Building2 size={14} className="shrink-0" />
            <span>Er du en organisasjon eller bedrift?</span>
            <ChevronDown size={13} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOrgOpen(false)}
              className="flex items-center gap-2 text-[13px] text-ink/45 hover:text-ink transition-colors group w-full mb-4"
            >
              <Building2 size={14} className="shrink-0" />
              <span>Er du en organisasjon eller bedrift?</span>
              <ChevronUp size={13} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
            <OrgInquiryForm
              defaultEmail={email}
              defaultName={name}
              onClose={() => setOrgOpen(false)}
            />
          </>
        )}
      </div>
        </>
      )}
    </div>
  );
}
