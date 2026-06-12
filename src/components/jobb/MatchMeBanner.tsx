"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiZap } from "react-icons/fi";

import { useAiQuota, bustAiQuotaCache } from "@/components/ai/useAiQuota";
import { cn } from "@/lib/cn";

type Phase = "idle" | "running" | "done" | "error";

const STEP_INTERVAL_MS = 2800;

/**
 * «Match meg med stillinger»-banneret på /jobb. variant "never" = gratis
 * førstegangskjøring; "stale" = hoved-CV-en er endret, re-match koster
 * kreditter. Gamifisert loader: stegtekst + indeterminert progressbar
 * (ren CSS, jobb-modulens keyframe-mønster) mens POST /api/jobb/match-me
 * kjører; router.refresh() etterpå laster listen med ferske scores og
 * serveren ser «fresh» → banneret forsvinner.
 */
export function MatchMeBanner({
  variant,
  cost,
  totalJobs,
}: {
  variant: "never" | "stale";
  cost: number;
  totalJobs: number;
}) {
  const router = useRouter();
  const quota = useAiQuota();
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = [
    "Leser CV-en din …",
    `Sammenligner med ${totalJobs.toLocaleString("nb-NO")} stillinger …`,
    "Rangerer treffene dine …",
  ];

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  async function run() {
    setPhase("running");
    setError(null);
    setStep(0);
    tickerRef.current = setInterval(
      () => setStep((s) => Math.min(s + 1, steps.length - 1)),
      STEP_INTERVAL_MS,
    );
    try {
      const res = await fetch("/api/jobb/match-me", { method: "POST" });
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;
        setPhase("error");
        setError(
          data?.code === "quota_exhausted"
            ? "Du er tom for AI-kreditter. Kjøp påfyll under Abonnement, så kan du oppdatere matchingen."
            : data?.code === "no_access"
              ? "Stillingsmatch krever aktivt abonnement."
              : (data?.error ?? "Matchingen feilet. Prøv igjen om litt."),
        );
        return;
      }
      bustAiQuotaCache();
      setPhase("done");
      setTimeout(() => router.refresh(), 600);
    } catch {
      if (tickerRef.current) clearInterval(tickerRef.current);
      setPhase("error");
      setError("Matchingen feilet. Prøv igjen om litt.");
    }
  }

  return (
    <section
      aria-label="Stillingsmatch"
      className="overflow-hidden rounded-2xl bg-ink px-5 py-4 text-bg motion-safe:animate-[recommended-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
    >
      {phase === "running" || phase === "done" ? (
        <div aria-live="polite">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <FiZap size={13} aria-hidden className="text-accent" />
            {phase === "done" ? "Ferdig! Fant treffene dine." : steps[step]}
          </p>
          <span className="mt-2.5 block h-[5px] overflow-hidden rounded-full bg-bg/15">
            <span
              className={cn(
                "block h-full origin-left rounded-full bg-accent",
                phase === "done"
                  ? "scale-x-100 transition-transform duration-500"
                  : "motion-safe:animate-[match-run-progress_14s_cubic-bezier(0.3,0.8,0.4,1)_both]",
              )}
            />
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13.5px] font-medium">
              <FiZap size={14} aria-hidden className="text-accent" />
              {variant === "never"
                ? "Match meg med stillinger"
                : "CV-en din er endret"}
            </p>
            <p className="mt-0.5 text-[12px] opacity-65">
              {variant === "never"
                ? "Vi sammenligner CV-en din med alle aktive stillinger og gir hver av dem en match-score. Gratis, tar under et minutt."
                : "Oppdater matchingen så scorene speiler den nye CV-en din."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {variant === "stale" && quota && !quota.unlimited && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg/10 px-2 py-0.5 text-[10.5px] font-medium">
                <FiZap size={10} aria-hidden />
                {cost} kreditter · {quota.remaining} igjen
              </span>
            )}
            <button
              type="button"
              onClick={run}
              className="flex h-[34px] items-center gap-1.5 rounded-full bg-bg px-4 text-[12px] font-medium text-ink outline-none transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {variant === "never" ? "Match meg" : "Oppdater matching"}
              <FiArrowRight size={12} aria-hidden />
            </button>
          </div>
          {phase === "error" && error && (
            <p role="alert" className="w-full text-[11.5px] text-accent">
              {error}{" "}
              {error.includes("påfyll") && (
                <Link href="/app/billing" className="underline underline-offset-2">
                  Kjøp AI-kreditter
                </Link>
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
