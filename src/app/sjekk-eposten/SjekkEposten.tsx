"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MailCheck, RefreshCw } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

const RESEND_COOLDOWN_S = 30;

/**
 * Mellomlanding etter registrering: bekreftelses-e-post er sendt. Lenken i
 * e-posten lander på /bekreftet som logger brukeren inn automatisk og
 * sender videre til /velkommen.
 */
export function SjekkEposten() {
  const email = useSearchParams().get("epost") ?? "";
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0) return;
    setError(null);
    const { error: err } = await supabaseBrowser().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/bekreftet` },
    });
    if (err) {
      setError("Kunne ikke sende på nytt. Vent litt og prøv igjen.");
      return;
    }
    setResent(true);
    setCooldown(RESEND_COOLDOWN_S);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-6">
      <div className="max-w-[440px] w-full text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto mb-7 flex size-20 items-center justify-center rounded-full bg-accent/10"
        >
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className="flex"
          >
            <MailCheck className="size-9 text-accent" aria-hidden />
          </motion.span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <h1 className="text-[28px] md:text-[34px] font-medium tracking-[-0.02em] text-ink mb-3">
            Nesten i mål!
          </h1>
          <p className="text-[14px] leading-relaxed text-ink/65 mb-1">
            Vi har sendt en bekreftelseslenke til
          </p>
          <p className="text-[14px] font-semibold text-ink mb-6 break-all">
            {email || "e-posten din"}
          </p>
          <p className="text-[12.5px] leading-relaxed text-ink/55 mb-8">
            Klikk på lenken i e-posten, så logger vi deg inn automatisk og
            tar deg videre. Sjekk søppelposten hvis den ikke dukker opp i
            løpet av et minutt.
          </p>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={resend}
              disabled={!email || cooldown > 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/15 dark:border-white/15 text-[13px] text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} aria-hidden />
              {cooldown > 0
                ? `Send på nytt (${cooldown}s)`
                : resent
                  ? "Send enda en gang"
                  : "Send e-posten på nytt"}
            </button>
            {resent && cooldown > 0 && (
              <p className="text-[12px] text-ink/55" role="status">
                Ny e-post sendt!
              </p>
            )}
            {error && (
              <p className="text-[12px] text-accent" role="alert">
                {error}
              </p>
            )}
            <Link
              href="/logg-inn"
              className="text-[12px] text-ink/45 underline underline-offset-2 hover:text-ink"
            >
              Allerede bekreftet? Logg inn
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
