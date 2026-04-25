"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripeJs } from "@/lib/stripe/client";

type Props = {
  slug: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function UpdateCardDialog({ slug, open, onClose, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/org/${slug}/setup-intent`, { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.clientSecret) {
          setLoadError(data.error ?? "Kunne ikke forberede kortoppdatering");
          return;
        }
        setClientSecret(data.clientSecret);
      } catch {
        if (!cancelled) setLoadError("Noe gikk galt");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  if (!open) return null;

  const options: StripeElementsOptions | null = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#0f0f0f",
            colorText: "#0f0f0f",
            colorTextPlaceholder: "#999",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "10px",
          },
        },
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-3xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-semibold mb-2">Oppdater betalingskort</h3>
        <p className="text-[13px] text-ink/50 mb-5">
          Kortet blir brukt ved neste fornyelse. Kortdata behandles av Stripe.
        </p>

        {loadError && (
          <p className="text-[13px] text-red-600 mb-4 p-3 rounded-xl bg-red-50">{loadError}</p>
        )}

        {!clientSecret && !loadError && (
          <div className="py-8 text-center text-[13px] text-ink/50">Laster…</div>
        )}

        {options && (
          <Elements stripe={getStripeJs()} options={options}>
            <CardForm slug={slug} onClose={onClose} onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  );
}

function CardForm({
  slug,
  onClose,
  onSuccess,
}: {
  slug: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Ugyldig kort");
      setSubmitting(false);
      return;
    }

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message ?? "Kunne ikke bekrefte kort");
      setSubmitting(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;
    if (!paymentMethodId) {
      setError("Mangler payment method");
      setSubmitting(false);
      return;
    }

    const res = await fetch(`/api/org/${slug}/default-payment-method`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Kunne ikke lagre kort");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 rounded-full text-[13px] hover:bg-black/5"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={submitting || !stripe}
          className="px-4 py-2 rounded-full bg-ink text-bg text-[13px] disabled:opacity-40"
        >
          {submitting ? "Lagrer…" : "Lagre kort"}
        </button>
      </div>
    </form>
  );
}
