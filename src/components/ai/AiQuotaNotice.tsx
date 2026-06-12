"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

export type AiError = {
  message: string;
  code: "quota_exhausted" | "no_access" | null;
};

/**
 * Leser et feilsvar fra AI-rutene til {message, code}. Rutene svarer
 * { error: string, code?, remaining? } — code "quota_exhausted" (402) og
 * "no_access" (403) skal rendre AiQuotaNotice i stedet for generisk feil.
 */
export async function parseAiError(res: Response): Promise<AiError> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;
  const code =
    data?.code === "quota_exhausted" || data?.code === "no_access"
      ? data.code
      : null;
  return { message: data?.error ?? `HTTP ${res.status}`, code };
}

/** Kvote-tom/mangler-abonnement-melding med kjøp-mer-CTA. */
export function AiQuotaNotice({ error }: { error: AiError }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-xl border border-accent/25 bg-accent/5 px-3.5 py-3"
    >
      <Zap size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 text-[12.5px] leading-relaxed">
        <p className="text-ink">{error.message}</p>
        <Link
          href="/app/billing"
          className="mt-1 inline-block font-medium text-accent underline underline-offset-2 hover:opacity-80"
        >
          {error.code === "no_access"
            ? "Se abonnement"
            : "Kjøp flere AI-handlinger"}
        </Link>
      </div>
    </div>
  );
}
