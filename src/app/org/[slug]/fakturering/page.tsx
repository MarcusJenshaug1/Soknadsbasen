import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type Stripe from "stripe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";
import { getOrgSeatPrice, formatNok } from "@/lib/stripe/pricing";
import { FaktureringClient } from "./FaktureringClient";

export const metadata = { title: "Fakturering – Søknadsbasen" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  past_due: "Betaling mislyktes",
  canceled: "Kansellert",
  incomplete: "Venter på betaling",
  unpaid: "Ubetalt",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-red-100 text-red-700",
  canceled: "bg-gray-200 text-gray-600",
  incomplete: "bg-yellow-100 text-yellow-700",
  unpaid: "bg-red-100 text-red-700",
};

function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items.data[0];
  const epoch =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  if (typeof epoch !== "number") return null;
  return new Date(epoch * 1000);
}

function getCardBrand(pm: Stripe.PaymentMethod | null): {
  brand: string;
  last4: string;
  exp: string;
} | null {
  if (!pm?.card) return null;
  return {
    brand: pm.card.brand,
    last4: pm.card.last4,
    exp: `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}`,
  };
}

export default async function FaktureringPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) return null;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      seatLimit: true,
      billingMethod: true,
      orgNumber: true,
      invoiceEmail: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) notFound();
  if (org.memberships[0].role !== "admin") notFound();

  const [price, activeMembers, pendingInvites, stripeSub, invoices] = await Promise.all([
    getOrgSeatPrice(),
    prisma.orgMembership.count({ where: { orgId: org.id, status: "active" } }),
    prisma.orgInvite.count({
      where: { orgId: org.id, expiresAt: { gt: new Date() } },
    }),
    org.stripeSubscriptionId
      ? stripe.subscriptions.retrieve(org.stripeSubscriptionId, {
          expand: ["default_payment_method", "latest_invoice"],
        })
      : Promise.resolve(null),
    org.stripeCustomerId
      ? stripe.invoices.list({ customer: org.stripeCustomerId, limit: 12 })
      : Promise.resolve({ data: [] as Stripe.Invoice[] }),
  ]);

  const periodEnd = stripeSub ? getPeriodEnd(stripeSub) : null;
  const cancelAtPeriodEnd = stripeSub?.cancel_at_period_end ?? false;
  const paymentMethod = stripeSub?.default_payment_method as Stripe.PaymentMethod | null | undefined;
  const card = getCardBrand(paymentMethod ?? null);
  const seatsUsed = activeMembers + pendingInvites;
  const totalMonthly = org.seatLimit * (price.amount / 100);

  const invoiceRows = invoices.data.map((inv) => ({
    id: inv.id!,
    created: inv.created,
    amount: inv.amount_due,
    currency: inv.currency,
    status: inv.status ?? "draft",
    pdfUrl: inv.hosted_invoice_url ?? inv.invoice_pdf ?? null,
    number: inv.number ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Fakturering</h1>
          <p className="text-[13px] text-ink/50 mt-0.5">
            Lisenser, betalingsmetode og fakturaer.
          </p>
        </div>
      </div>

      <section className="border border-black/8 rounded-xl bg-bg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1.5">
              Status
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-block text-[12px] px-2.5 py-0.5 rounded-full font-medium ${
                  STATUS_CLASSES[org.status] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_LABELS[org.status] ?? org.status}
              </span>
              {cancelAtPeriodEnd && periodEnd && (
                <span className="text-[12px] text-red-600">
                  Avsluttes {format(periodEnd, "d. MMM yyyy", { locale: nb })}
                </span>
              )}
              {periodEnd && !cancelAtPeriodEnd && (
                <span className="text-[12px] text-ink/50">
                  Neste fornyelse {format(periodEnd, "d. MMM yyyy", { locale: nb })}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1.5">
              Per måned
            </div>
            <div className="text-[22px] font-semibold tabular-nums">
              {totalMonthly.toLocaleString("nb-NO")} kr
            </div>
            <div className="text-[11px] text-ink/40 tabular-nums">
              {org.seatLimit} × {formatNok(price.amount)}
            </div>
          </div>
        </div>
      </section>

      <FaktureringClient
        slug={slug}
        seatLimit={org.seatLimit}
        seatsUsed={seatsUsed}
        activeMembers={activeMembers}
        seatPriceOre={price.amount}
        billingMethod={org.billingMethod as "card" | "invoice"}
        orgNumber={org.orgNumber ?? ""}
        invoiceEmail={org.invoiceEmail ?? ""}
        card={card}
        invoices={invoiceRows}
        canCancel={!!stripeSub && !cancelAtPeriodEnd && org.status !== "canceled"}
        isAlreadyCancelling={cancelAtPeriodEnd}
      />
    </div>
  );
}
