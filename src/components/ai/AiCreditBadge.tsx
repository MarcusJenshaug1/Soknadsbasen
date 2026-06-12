"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAiQuota, bustAiQuotaCache } from "./useAiQuota";

// Re-eksport for eksisterende importsteder; nye konsumenter (særlig
// jobb-modulen) bør importere fra ./useAiQuota direkte for å unngå lucide.
export { useAiQuota, bustAiQuotaCache };

/**
 * Oransje kreditt-merke ved AI-knapper: hva kjøringen koster og hvor mange
 * AI-kreditter brukeren har igjen. Skjules helt for unlimited-brukere
 * (admin/selger/evig kvote) — for dem er prisen støy.
 */
export function AiCreditBadge({
  cost = 1,
  className,
}: {
  cost?: number;
  className?: string;
}) {
  const quota = useAiQuota();
  if (quota?.unlimited) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent-ink",
        className,
      )}
    >
      <Zap size={10} aria-hidden />
      {cost} {cost === 1 ? "kreditt" : "kreditter"}
      {quota && !quota.unlimited && (
        <span className="opacity-70">· {quota.remaining} igjen</span>
      )}
    </span>
  );
}
