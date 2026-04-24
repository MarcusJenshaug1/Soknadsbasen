"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CreditCard, FileText, Users, AlertTriangle } from "lucide-react";
import { UpdateCardDialog } from "./UpdateCardDialog";

type Card = { brand: string; last4: string; exp: string } | null;

type InvoiceRow = {
  id: string;
  created: number;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  number: string | null;
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: "Betalt",
  open: "Ubetalt",
  void: "Annullert",
  uncollectible: "Utestående",
  draft: "Utkast",
};

const INVOICE_STATUS_CLASSES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  open: "bg-yellow-100 text-yellow-700",
  void: "bg-gray-100 text-gray-600",
  uncollectible: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-600",
};

export function FaktureringClient({
  slug,
  seatLimit,
  seatsUsed,
  activeMembers,
  seatPriceOre,
  billingMethod,
  orgNumber: initialOrgNumber,
  invoiceEmail: initialInvoiceEmail,
  card,
  invoices,
  canCancel,
  isAlreadyCancelling,
}: {
  slug: string;
  seatLimit: number;
  seatsUsed: number;
  activeMembers: number;
  seatPriceOre: number;
  billingMethod: "card" | "invoice";
  orgNumber: string;
  invoiceEmail: string;
  card: Card;
  invoices: InvoiceRow[];
  canCancel: boolean;
  isAlreadyCancelling: boolean;
}) {
  const router = useRouter();
  const seatPriceNok = seatPriceOre / 100;

  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [newLimit, setNewLimit] = useState(seatLimit);
  const [seatSaving, setSeatSaving] = useState(false);

  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [method, setMethod] = useState<"card" | "invoice">(billingMethod);
  const [orgNumber, setOrgNumber] = useState(initialOrgNumber);
  const [invoiceEmail, setInvoiceEmail] = useState(initialInvoiceEmail);
  const [billingSaving, setBillingSaving] = useState(false);

  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const usagePct = Math.min(100, (seatsUsed / seatLimit) * 100);
  const poolFull = seatsUsed >= seatLimit;

  function flash(ok: boolean, text: string) {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSaveSeats() {
    if (newLimit === seatLimit) {
      setSeatDialogOpen(false);
      return;
    }
    setSeatSaving(true);
    try {
      const res = await fetch(`/api/org/${slug}/seats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newLimit }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(false, data.error ?? "Kunne ikke endre lisenser");
        return;
      }
      flash(true, `Lisenser oppdatert til ${newLimit}. Proration håndteres automatisk.`);
      setSeatDialogOpen(false);
      router.refresh();
    } catch {
      flash(false, "Noe gikk galt");
    } finally {
      setSeatSaving(false);
    }
  }

  async function handleSaveBillingMethod() {
    if (method === "invoice") {
      if (!/^\d{9}$/.test(orgNumber)) {
        flash(false, "Organisasjonsnummer må være 9 siffer");
        return;
      }
      if (!/.+@.+\..+/.test(invoiceEmail)) {
        flash(false, "Ugyldig faktura-epost");
        return;
      }
    }
    setBillingSaving(true);
    try {
      const res = await fetch(`/api/org/${slug}/billing-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          orgNumber: method === "invoice" ? orgNumber : undefined,
          invoiceEmail: method === "invoice" ? invoiceEmail : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(false, data.error ?? "Kunne ikke bytte betalingsmetode");
        return;
      }
      flash(true, "Betalingsmetode oppdatert");
      setBillingDialogOpen(false);
      const switchedToCard = method === "card" && billingMethod === "invoice";
      if (switchedToCard && !card) {
        setCardDialogOpen(true);
      } else {
        router.refresh();
      }
    } catch {
      flash(false, "Noe gikk galt");
    } finally {
      setBillingSaving(false);
    }
  }

  function handleCardSuccess() {
    flash(true, "Kort oppdatert. Brukes ved neste fornyelse.");
    router.refresh();
  }

  async function handleCancel() {
    if (!confirm("Avslutte abonnementet ved periodeslutt?")) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/org/${slug}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        flash(false, data.error ?? "Kunne ikke avslutte");
        return;
      }
      flash(true, "Avsluttes ved periodeslutt");
      router.refresh();
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleResume() {
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/org/${slug}/cancel`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        flash(false, data.error ?? "Kunne ikke gjenoppta");
        return;
      }
      flash(true, "Abonnementet fortsetter");
      router.refresh();
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-[13px] shadow-lg ${
            toast.ok
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      <section className="border border-black/8 rounded-xl bg-bg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-ink/40" />
            <h2 className="text-[13px] font-semibold">Lisenser</h2>
          </div>
          <button
            onClick={() => {
              setNewLimit(seatLimit);
              setSeatDialogOpen(true);
            }}
            className="text-[12px] px-3 py-1.5 rounded-full border border-black/15 hover:border-ink transition-colors"
          >
            Endre antall
          </button>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[24px] font-semibold tabular-nums">{seatsUsed}</span>
          <span className="text-[14px] text-ink/50">av {seatLimit} brukt</span>
        </div>
        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${
              poolFull ? "bg-red-500" : usagePct > 80 ? "bg-yellow-500" : "bg-ink"
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <p className="text-[12px] text-ink/50">
          {activeMembers} aktive, {seatsUsed - activeMembers} ventende.{" "}
          <a
            href={`/org/${slug}/medlemmer`}
            className="underline underline-offset-2 hover:text-ink"
          >
            Se medlemmer →
          </a>
        </p>
      </section>

      <section className="border border-black/8 rounded-xl bg-bg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-ink/40" />
            <h2 className="text-[13px] font-semibold">Betalingsmetode</h2>
          </div>
          <button
            onClick={() => setBillingDialogOpen(true)}
            className="text-[12px] px-3 py-1.5 rounded-full border border-black/15 hover:border-ink transition-colors"
          >
            Endre
          </button>
        </div>
        {billingMethod === "card" ? (
          <div className="flex items-center justify-between">
            <div>
              {card ? (
                <>
                  <div className="text-[14px] font-medium capitalize">
                    {card.brand} •••• {card.last4}
                  </div>
                  <div className="text-[12px] text-ink/50 tabular-nums">
                    Utløper {card.exp}
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-ink/50">Ingen kort registrert</div>
              )}
            </div>
            <button
              onClick={() => setCardDialogOpen(true)}
              className="text-[12px] px-3 py-1.5 rounded-full bg-ink text-bg"
            >
              {card ? "Oppdater kort" : "Legg til kort"}
            </button>
          </div>
        ) : (
          <div>
            <div className="text-[14px] font-medium">Faktura per epost</div>
            <div className="text-[12px] text-ink/50 mt-0.5">
              {initialInvoiceEmail || "Ingen faktura-epost"} · Org.nr{" "}
              {initialOrgNumber || "—"}
            </div>
            <p className="text-[12px] text-ink/40 mt-2">
              14 dagers betalingsfrist. EHF/Peppol kommer senere.
            </p>
          </div>
        )}
      </section>

      <section className="border border-black/8 rounded-xl bg-bg overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2 border-b border-black/6">
          <FileText size={14} className="text-ink/40" />
          <h2 className="text-[13px] font-semibold">Fakturahistorikk</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="text-[13px] text-ink/50 px-5 py-6">Ingen fakturaer ennå.</p>
        ) : (
          <div className="divide-y divide-black/6">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="px-5 py-3 flex items-center justify-between hover:bg-black/[0.015] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium tabular-nums w-24">
                    {format(new Date(inv.created * 1000), "d. MMM yyyy", { locale: nb })}
                  </span>
                  {inv.number && (
                    <span className="text-[11px] text-ink/40 tabular-nums">
                      {inv.number}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium tabular-nums">
                    {(inv.amount / 100).toLocaleString("nb-NO")} kr
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      INVOICE_STATUS_CLASSES[inv.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-ink/40 hover:text-ink underline underline-offset-2"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-red-200 bg-red-50/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} className="text-red-600" />
          <h2 className="text-[13px] font-semibold text-red-700">Farlig sone</h2>
        </div>
        {isAlreadyCancelling ? (
          <>
            <p className="text-[13px] text-ink/70 mb-3">
              Abonnementet er satt til å avsluttes ved periodeslutt.
            </p>
            <button
              onClick={handleResume}
              disabled={cancelLoading}
              className="text-[12px] px-3 py-1.5 rounded-full border border-ink hover:bg-ink hover:text-bg transition-colors disabled:opacity-40"
            >
              {cancelLoading ? "…" : "Gjenoppta abonnement"}
            </button>
          </>
        ) : (
          <>
            <p className="text-[13px] text-ink/70 mb-3">
              Avsluttes ved neste fornyelse. Medlemmer mister tilgang etter periodeslutt.
            </p>
            <button
              onClick={handleCancel}
              disabled={!canCancel || cancelLoading}
              className="text-[12px] px-3 py-1.5 rounded-full border border-red-300 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
            >
              {cancelLoading ? "…" : "Avslutt abonnement"}
            </button>
          </>
        )}
      </section>

      <UpdateCardDialog
        slug={slug}
        open={cardDialogOpen}
        onClose={() => setCardDialogOpen(false)}
        onSuccess={handleCardSuccess}
      />

      {seatDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => !seatSaving && setSeatDialogOpen(false)}
        >
          <div
            className="bg-bg rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-semibold mb-1">Endre antall lisenser</h3>
            <p className="text-[13px] text-ink/50 mb-5">
              Minimum {activeMembers} (aktive medlemmer). Proration automatisk.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setNewLimit((n) => Math.max(activeMembers, n - 1))}
                className="h-9 w-9 rounded-full border border-black/15 text-[16px] hover:border-ink"
              >
                −
              </button>
              <input
                type="number"
                min={activeMembers}
                max={100}
                value={newLimit}
                onChange={(e) =>
                  setNewLimit(
                    Math.max(
                      activeMembers,
                      Math.min(100, Number(e.target.value) || activeMembers),
                    ),
                  )
                }
                className="w-20 text-center border-b border-black/20 py-2 text-[16px] outline-none focus:border-ink tabular-nums"
              />
              <button
                type="button"
                onClick={() => setNewLimit((n) => Math.min(100, n + 1))}
                className="h-9 w-9 rounded-full border border-black/15 text-[16px] hover:border-ink"
              >
                +
              </button>
              <div className="ml-auto text-right">
                <div className="text-[16px] font-semibold tabular-nums">
                  {(newLimit * seatPriceNok).toLocaleString("nb-NO")} kr
                </div>
                <div className="text-[11px] text-ink/50">per måned</div>
              </div>
            </div>
            {newLimit !== seatLimit && (
              <p className="text-[12px] text-ink/60 mb-4 p-3 rounded-lg bg-black/[0.03]">
                {newLimit > seatLimit
                  ? `+${newLimit - seatLimit} lisens${newLimit - seatLimit > 1 ? "er" : ""}. Prorated beløp belastes i dag.`
                  : `${seatLimit - newLimit} lisens${seatLimit - newLimit > 1 ? "er" : ""} mindre. Prorated kreditering ved neste faktura.`}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSeatDialogOpen(false)}
                disabled={seatSaving}
                className="px-4 py-2 rounded-full text-[13px] hover:bg-black/5"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveSeats}
                disabled={seatSaving || newLimit === seatLimit}
                className="px-4 py-2 rounded-full bg-ink text-bg text-[13px] disabled:opacity-40"
              >
                {seatSaving ? "Lagrer…" : "Bekreft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {billingDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => !billingSaving && setBillingDialogOpen(false)}
        >
          <div
            className="bg-bg rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-semibold mb-4">Betalingsmetode</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setMethod("card")}
                className={`px-4 py-2.5 rounded-lg border text-[13px] transition-colors ${
                  method === "card"
                    ? "border-ink bg-ink text-bg"
                    : "border-black/15 hover:border-ink/40"
                }`}
              >
                Kort
              </button>
              <button
                onClick={() => setMethod("invoice")}
                className={`px-4 py-2.5 rounded-lg border text-[13px] transition-colors ${
                  method === "invoice"
                    ? "border-ink bg-ink text-bg"
                    : "border-black/15 hover:border-ink/40"
                }`}
              >
                Faktura (PDF)
              </button>
            </div>

            {method === "invoice" && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">
                    Organisasjonsnummer
                  </label>
                  <input
                    value={orgNumber}
                    onChange={(e) =>
                      setOrgNumber(e.target.value.replace(/\D/g, "").slice(0, 9))
                    }
                    placeholder="999888777"
                    inputMode="numeric"
                    className="w-full border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">
                    Faktura-epost
                  </label>
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    placeholder="faktura@virksomhet.no"
                    className="w-full border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink"
                  />
                </div>
              </div>
            )}
            {method === "card" && billingMethod === "invoice" && (
              <p className="text-[12px] text-ink/60 mb-4 p-3 rounded-lg bg-black/[0.03]">
                Etter lagring blir du bedt om å registrere et kort.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBillingDialogOpen(false)}
                disabled={billingSaving}
                className="px-4 py-2 rounded-full text-[13px] hover:bg-black/5"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveBillingMethod}
                disabled={billingSaving}
                className="px-4 py-2 rounded-full bg-ink text-bg text-[13px] disabled:opacity-40"
              >
                {billingSaving ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
