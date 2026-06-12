"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/cn";

type QuotaPayload = {
  unlimited: boolean;
  remaining: number;
};

// Modul-delt cache med kort TTL: flere badges på samme side deler én
// fetch, og tallet er ferskt nok etter at brukeren har brukt en kreditt.
const TTL_MS = 30_000;
let cached: { at: number; promise: Promise<QuotaPayload | null> } | null = null;

function fetchQuota(): Promise<QuotaPayload | null> {
  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) {
    cached = {
      at: now,
      promise: fetch("/api/ai/quota")
        .then((r) => (r.ok ? (r.json() as Promise<QuotaPayload>) : null))
        .catch(() => null),
    };
  }
  return cached.promise;
}

/** Kall etter et vellykket AI-kall så neste badge-visning er oppdatert. */
export function bustAiQuotaCache() {
  cached = null;
}

export function useAiQuota(): QuotaPayload | null {
  const [quota, setQuota] = useState<QuotaPayload | null>(null);
  useEffect(() => {
    let mounted = true;
    fetchQuota().then((q) => {
      if (mounted) setQuota(q);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return quota;
}

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
