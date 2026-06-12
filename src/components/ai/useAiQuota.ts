"use client";

import { useEffect, useState } from "react";

export type QuotaPayload = {
  unlimited: boolean;
  remaining: number;
};

// Modul-delt cache med kort TTL: flere badges på samme side deler én
// fetch, og tallet er ferskt nok etter at brukeren har brukt en kreditt.
// Egen fil (uten ikon-imports) så jobb-modulen kan bruke hooken uten å
// dra lucide inn i bundelen sin.
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
