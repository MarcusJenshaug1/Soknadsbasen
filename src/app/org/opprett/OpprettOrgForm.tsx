"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/org";

type BillingMethod = "card" | "invoice";

export function OpprettOrgForm({ seatPriceNok }: { seatPriceNok: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [seatLimit, setSeatLimit] = useState(1);
  const [billingMethod, setBillingMethod] = useState<BillingMethod>("card");
  const [orgNumber, setOrgNumber] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
    if (!displayName) setDisplayName(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (billingMethod === "invoice") {
      if (!/^\d{9}$/.test(orgNumber)) {
        setError("Organisasjonsnummer må være 9 siffer");
        return;
      }
      if (!/.+@.+\..+/.test(invoiceEmail)) {
        setError("Ugyldig faktura-epost");
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          displayName,
          slug,
          seatLimit,
          billingMethod,
          orgNumber: billingMethod === "invoice" ? orgNumber : undefined,
          invoiceEmail: billingMethod === "invoice" ? invoiceEmail : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }
      router.replace(data.url);
    } catch {
      setError("Noe gikk galt");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full border-b border-black/20 bg-transparent py-2 text-[15px] outline-none focus:border-ink placeholder:text-ink/40 transition-colors";
  const totalNok = seatLimit * seatPriceNok;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          Organisasjonsnavn
        </label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Velle AS"
          required
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          Visningsnavn (vises i appen)
        </label>
        <input
          className={inputCls}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Velle"
          required
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
          URL-slug
        </label>
        <div className="flex items-center gap-1 border-b border-black/20 focus-within:border-ink transition-colors">
          <span className="text-[13px] text-ink/40 shrink-0">søknadsbasen.no/org/</span>
          <input
            className="flex-1 bg-transparent py-2 text-[15px] outline-none"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              setSlugEdited(true);
            }}
            placeholder="velle"
            required
            pattern="[a-z0-9-]+"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-2">
          Antall lisenser (inkludert deg)
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSeatLimit((n) => Math.max(1, n - 1))}
            className="h-10 w-10 rounded-full border border-black/15 text-[18px] hover:border-ink transition-colors"
            aria-label="Minus"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={100}
            value={seatLimit}
            onChange={(e) =>
              setSeatLimit(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
            }
            className="w-20 text-center border-b border-black/20 py-2 text-[18px] outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => setSeatLimit((n) => Math.min(100, n + 1))}
            className="h-10 w-10 rounded-full border border-black/15 text-[18px] hover:border-ink transition-colors"
            aria-label="Pluss"
          >
            +
          </button>
          <div className="ml-auto text-right">
            <div className="text-[18px] font-semibold">{totalNok.toLocaleString("nb-NO")} kr</div>
            <div className="text-[11px] text-ink/50">per måned</div>
          </div>
        </div>
        <p className="text-[12px] text-ink/50 mt-2">
          {seatPriceNok} kr per lisens per måned. Du kan justere antall senere.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-2">
          Betalingsmetode
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setBillingMethod("card")}
            className={`px-4 py-3 rounded-xl border text-[13px] transition-colors ${
              billingMethod === "card"
                ? "border-ink bg-ink text-bg"
                : "border-black/15 hover:border-ink/40"
            }`}
          >
            Kort
          </button>
          <button
            type="button"
            onClick={() => setBillingMethod("invoice")}
            className={`px-4 py-3 rounded-xl border text-[13px] transition-colors ${
              billingMethod === "invoice"
                ? "border-ink bg-ink text-bg"
                : "border-black/15 hover:border-ink/40"
            }`}
          >
            Faktura (PDF)
          </button>
        </div>
      </div>

      {billingMethod === "invoice" && (
        <div className="space-y-4 rounded-xl border border-black/10 p-4 bg-black/[0.02]">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
              Organisasjonsnummer (9 siffer)
            </label>
            <input
              className={inputCls}
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="999888777"
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-ink/50 mb-1">
              Faktura-epost
            </label>
            <input
              type="email"
              className={inputCls}
              value={invoiceEmail}
              onChange={(e) => setInvoiceEmail(e.target.value)}
              placeholder="faktura@virksomhet.no"
              required
            />
          </div>
          <p className="text-[12px] text-ink/50">
            Faktura sendes som PDF med 14 dagers betalingsfrist. EHF via Peppol kommer senere.
          </p>
        </div>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !name || !displayName || !slug}
        className="w-full py-3 rounded-full bg-ink text-bg text-[14px] font-medium disabled:opacity-40 transition-opacity"
      >
        {loading
          ? "Oppretter…"
          : billingMethod === "card"
            ? "Opprett og gå til betaling →"
            : "Opprett og motta faktura →"}
      </button>
      <p className="text-[12px] text-ink/50 text-center">
        {billingMethod === "card"
          ? "Du vil bli sendt til Stripe for å fullføre betalingen."
          : "Faktura sendes på epost rett etter oppretting."}
      </p>
    </form>
  );
}
