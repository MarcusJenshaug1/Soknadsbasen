"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function BillingPortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) throw new Error("Kunne ikke åpne kundeportal");
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={loading} size="md">
        {loading ? "Åpner portal…" : "Administrer abonnement"}
      </Button>
      {error && <p className="text-[12px] text-[#D5592E]">{error}</p>}
    </div>
  );
}
