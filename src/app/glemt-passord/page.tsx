"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";

export default function GlemtPassordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nytt-passord`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e] flex flex-col p-8 md:p-12">
      <Logo />
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <SectionLabel className="mb-4">Glemt passord</SectionLabel>
        <h1 className="text-[40px] md:text-[44px] leading-[1] tracking-[-0.03em] font-medium mb-3">
          Nullstill passord.
        </h1>
        <p className="text-[14px] text-[#14110e]/65 mb-10">
          Vi sender en lenke til e-posten din.
        </p>

        {sent ? (
          <div className="space-y-4">
            <p className="text-[14px] text-[#14110e]/80">
              Sjekk innboksen for <span className="font-medium">{email}</span>.
              Lenken utløper etter en time.
            </p>
            <Link
              href="/logg-inn"
              className="inline-block text-[13px] text-[#c15a3a] hover:text-[#14110e]"
            >
              ← Tilbake til innlogging
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2">
                E-post
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-black/15 focus:border-[#c15a3a] py-2.5 outline-none text-[15px]"
              />
            </div>
            {error && <p className="text-[12px] text-[#c15a3a]">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 mt-4 rounded-full bg-[#14110e] text-[#faf8f5] text-[14px] font-medium hover:bg-[#c15a3a] transition-colors disabled:opacity-50"
            >
              {submitting ? "Sender…" : "Send lenke"}
            </button>
            <Link
              href="/logg-inn"
              className="block text-[12px] text-[#14110e]/60 hover:text-[#c15a3a]"
            >
              ← Tilbake til innlogging
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
