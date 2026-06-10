"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Delt presentasjon for error.tsx-boundaries (rot + /app).
 * - `retry` skal være Next sin `unstable_retry` (re-fetcher segmentet;
 *   `reset()` re-rendrer uten re-fetch og kan ikke gjenopprette server-feil).
 * - Escape-lenken er en hard navigasjon: boundary nullstilles bare ved
 *   pathname-ENDRING, så en soft-nav til samme rute ville vært no-op.
 * - «Kopier feildetaljer» finnes fordi appen ikke har noe error-sink ennå og
 *   client-krasj aldri får digest — uten denne har support null signal.
 */
export function ErrorFallback({
  error,
  retry,
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref: string;
  homeLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  const copyDetails = async () => {
    const details = [
      `URL: ${window.location.href}`,
      `UA: ${navigator.userAgent}`,
      `Time: ${new Date().toISOString()}`,
      `Name: ${error.name}`,
      `Message: ${error.message}`,
      error.digest ? `Digest: ${error.digest}` : null,
      "",
      error.stack ?? "(no stack)",
    ]
      .filter((l) => l !== null)
      .join("\n");
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard kan være blokkert (iOS uten permission) — da får brukeren
      // i det minste detaljene synlig i konsollen via console.error over.
    }
  };

  return (
    <main className="min-h-[60dvh] flex items-center justify-center p-8 bg-bg text-ink">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Noe gikk galt</h1>
        <p className="text-ink/70">
          Vi klarte ikke å laste denne siden. Prøv på nytt, eller gå videre.
          Vedvarer feilen, kopier feildetaljene og send dem til oss.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button onClick={() => retry()}>Prøv igjen</Button>
          {/* Hard navigasjon med vilje: garantert fersk RSC-fetch og fungerer
              også når feilen oppsto på målruten selv. */}
          <a
            href={homeHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors whitespace-nowrap px-5 py-2.5 text-[13px] border border-black/15 dark:border-white/15 text-ink hover:border-black/30 dark:hover:border-white/30"
          >
            {homeLabel}
          </a>
        </div>
        <div className="pt-1">
          <Button variant="text" size="sm" onClick={copyDetails} aria-live="polite">
            {copied ? "Kopiert" : "Kopier feildetaljer"}
          </Button>
        </div>
        {error.digest ? (
          <p className="text-xs text-ink/45">Referanse: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
