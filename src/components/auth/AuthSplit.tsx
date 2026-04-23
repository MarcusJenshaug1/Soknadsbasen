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
import { cn } from "@/lib/cn";

type Mode = "login" | "register";

const underline =
  "w-full bg-transparent border-b border-black/15 focus:border-[#c15a3a] py-2.5 outline-none text-[15px]";
const primary =
  "w-full py-3.5 mt-4 rounded-full bg-[#14110e] text-[#faf8f5] text-[14px] font-medium hover:bg-[#c15a3a] transition-colors disabled:opacity-50";
const label =
  "text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2";

/**
 * Single-column auth screen with a toggle between login and register.
 * `focus` sets the initial mode; URL stays on the route the user navigated to.
 */
export function AuthSplit({ focus }: { focus: Mode }) {
  const [mode, setMode] = useState<Mode>(focus);

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e] flex flex-col">
      <header className="max-w-[560px] mx-auto w-full px-6 md:px-10 pt-6 md:pt-10 flex items-center justify-between">
        <Logo href="/" />
        {mode === "register" && (
          <SectionLabel tone="accent">Gratis for alltid</SectionLabel>
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

      <footer className="max-w-[560px] mx-auto w-full px-6 md:px-10 pb-6 md:pb-8 text-center text-[11px] text-[#14110e]/45">
        {mode === "login" ? (
          <>
            Ny her?{" "}
            <button
              onClick={() => setMode("register")}
              className="text-[#c15a3a] hover:text-[#14110e] underline-offset-2 hover:underline"
            >
              Opprett konto
            </button>
          </>
        ) : (
          <>
            Har du allerede konto?{" "}
            <button
              onClick={() => setMode("login")}
              className="text-[#c15a3a] hover:text-[#14110e] underline-offset-2 hover:underline"
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
      className="inline-flex bg-[#eee9df] rounded-full p-1 w-full"
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
              ? "bg-[#faf8f5] text-[#14110e] font-medium"
              : "text-[#14110e]/60 hover:text-[#14110e]",
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
      <p className="text-[14px] text-[#14110e]/65 mb-8">
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
        {error && <p className="text-[12px] text-[#c15a3a]">{error}</p>}
        <button type="submit" disabled={submitting} className={primary}>
          {submitting ? "Logger inn…" : "Logg inn"}
        </button>
        <div className="text-right">
          <Link
            href="/glemt-passord"
            className="text-[12px] text-[#14110e]/60 hover:text-[#c15a3a]"
          >
            Glemt passord?
          </Link>
        </div>
      </form>
    </div>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      <SectionLabel className="mb-4">Ny her</SectionLabel>
      <h1 className="text-[36px] md:text-[40px] leading-[1] tracking-[-0.03em] font-medium mb-3">
        Opprett basen din.
      </h1>
      <p className="text-[14px] text-[#14110e]/65 mb-8">
        Tre felt. Null kredittkort.
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
        {error && <p className="text-[12px] text-[#c15a3a]">{error}</p>}
        <button type="submit" disabled={submitting} className={primary}>
          {submitting ? "Oppretter…" : "Opprett konto"}
        </button>
        <p className="text-[11px] text-[#14110e]/55 leading-relaxed pt-1">
          Ved registrering godtar du våre vilkår og personvernerklæring.
        </p>
      </form>
    </div>
  );
}
