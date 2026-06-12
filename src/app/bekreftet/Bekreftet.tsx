"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Landingssiden for bekreftelseslenken i e-posten: GoTrue verifiserer og
 * redirecter hit med auth-kode/tokens i URL-en; Supabase-klienten plukker
 * dem opp og etablerer sesjonen (auto-innlogging). Når sesjonen er på
 * plass sendes brukeren til /velkommen (onboarding).
 *
 * Fallback: åpnes lenken i en ANNEN nettleser enn registreringen skjedde i
 * mangler PKCE-verifieren — da er e-posten likevel bekreftet, og vi viser
 * en vennlig «logg inn»-melding i stedet for evig spinner.
 */
export function Bekreftet() {
  const router = useRouter();
  const fetchSession = useAuthStore((s) => s.fetchSession);
  const [state, setState] = useState<"working" | "loggedIn" | "manual">("working");
  const done = useRef(false);

  useEffect(() => {
    const supabase = supabaseBrowser();

    const goWelcome = async () => {
      if (done.current) return;
      done.current = true;
      setState("loggedIn");
      await fetchSession();
      // Kort pause så suksess-animasjonen rekker å vises.
      setTimeout(() => router.replace("/velkommen"), 1200);
    };

    // createBrowserClient auto-detekterer kode/tokens i URL-en ved load;
    // vi lytter på resultatet og sjekker i tillegg om sesjonen allerede
    // finnes (f.eks. lenke klikket to ganger).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void goWelcome();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goWelcome();
    });

    // Ingen sesjon etter 6 sek = annen nettleser/utløpt kode → manuell login.
    const fallback = setTimeout(() => {
      if (!done.current) setState("manual");
    }, 6000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [router, fetchSession]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg px-6">
      <div className="max-w-[440px] w-full text-center">
        {state === "working" && (
          <div aria-live="polite">
            <span className="mx-auto mb-6 flex size-16 items-center justify-center">
              <span className="size-9 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" />
            </span>
            <p className="text-[15px] font-medium text-ink">Bekrefter e-posten din …</p>
            <p className="mt-1 text-[12.5px] text-ink/55">Logger deg inn automatisk.</p>
          </div>
        )}

        {state === "loggedIn" && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            aria-live="polite"
          >
            <span className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-accent/10">
              <PartyPopper className="size-9 text-accent" aria-hidden />
            </span>
            <h1 className="text-[28px] md:text-[34px] font-medium tracking-[-0.02em] text-ink mb-2">
              Velkommen til Søknadsbasen!
            </h1>
            <p className="text-[14px] text-ink/65">
              E-posten er bekreftet og du er logget inn. Sender deg videre …
            </p>
          </motion.div>
        )}

        {state === "manual" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            aria-live="polite"
          >
            <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="size-8 text-accent" aria-hidden />
            </span>
            <h1 className="text-[24px] font-medium tracking-[-0.02em] text-ink mb-2">
              E-posten er bekreftet!
            </h1>
            <p className="text-[13px] leading-relaxed text-ink/60 mb-7">
              Det ser ut som du åpnet lenken i en annen nettleser enn du
              registrerte deg i, så logg inn for å komme i gang.
            </p>
            <Link
              href="/logg-inn?redirect=/velkommen"
              className="inline-flex px-7 py-3 rounded-full bg-ink text-bg text-[13.5px] font-medium hover:opacity-85 transition-opacity"
            >
              Logg inn
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
