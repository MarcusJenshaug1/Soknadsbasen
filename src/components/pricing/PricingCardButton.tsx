"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  priceId: string;
  mode: "subscription" | "payment";
  label: string;
  variant?: "primary" | "inverse";
};

export function PricingCardButton({ priceId, mode, label, variant = "primary" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
      });
      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({ error: "" }))) as {
          error?: string;
        };
        throw new Error(msg || "Kunne ikke starte betaling");
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={onClick}
        disabled={loading}
        size="lg"
        variant={variant}
        className="w-full"
      >
        {loading ? "Sender deg til Stripe…" : label}
      </Button>
      {error && (
        <p className={variant === "inverse" ? "text-[12px] text-white/80" : "text-[12px] text-[#c15a3a]"}>
          {error}
        </p>
      )}
    </div>
  );
}
