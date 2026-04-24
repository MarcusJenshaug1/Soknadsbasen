"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import {
  PasswordStrength,
  passwordScore,
} from "@/components/ui/PasswordStrength";

/**
 * Landing page after the user clicks the recovery email link. Supabase
 * exchanges the URL token for a short-lived session on load — then we call
 * `updateUser` to set the new password.
 */
export default function NyttPassordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const score = passwordScore(password);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Passordet må være minst 8 tegn.");
      return;
    }
    if (password !== confirm) {
      setError("Passordene stemmer ikke.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/app"), 1500);
  }

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e] flex flex-col p-8 md:p-12">
      <Logo />
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <SectionLabel className="mb-4">Nytt passord</SectionLabel>
        <h1 className="text-[40px] md:text-[44px] leading-[1] tracking-[-0.03em] font-medium mb-3">
          Sett nytt passord.
        </h1>

        {!sessionReady ? (
          <p className="text-[14px] text-[#14110e]/65">
            Validerer lenken …
          </p>
        ) : done ? (
          <p className="text-[14px] text-[#14110e]/80">
            Passordet er oppdatert. Sender deg videre …
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 mt-6">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2">
                Nytt passord
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-black/15 focus:border-[#D5592E] py-2.5 outline-none text-[15px]"
              />
              <PasswordStrength score={score} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2">
                Bekreft passord
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-transparent border-b border-black/15 focus:border-[#D5592E] py-2.5 outline-none text-[15px]"
              />
            </div>
            {error && <p className="text-[12px] text-[#D5592E]">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 mt-4 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium hover:bg-[#a94424] transition-colors disabled:opacity-50"
            >
              {submitting ? "Oppdaterer…" : "Lagre passord"}
            </button>
            <Link
              href="/logg-inn"
              className="block text-[12px] text-[#14110e]/60 hover:text-[#D5592E]"
            >
              ← Tilbake til innlogging
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
