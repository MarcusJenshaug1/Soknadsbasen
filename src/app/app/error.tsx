"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/app error boundary]", error);
  }, [error]);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-8 bg-bg text-ink">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Noe gikk galt</h1>
        <p className="text-ink/70">
          Vi klarte ikke å laste denne siden. Prøv på nytt, eller gå tilbake til
          appen. Vedvarer feilen, ta kontakt med oss.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()}>Prøv igjen</Button>
          <LinkButton href="/app" variant="secondary">
            Til appen
          </LinkButton>
        </div>
        {error.digest ? (
          <p className="pt-2 text-xs text-ink/45">Referanse: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
