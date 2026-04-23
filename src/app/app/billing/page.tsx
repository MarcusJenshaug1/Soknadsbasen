import { redirect } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PricingCardButton } from "@/components/pricing/PricingCardButton";
import { BillingPortalButton } from "./BillingPortalButton";

export const metadata = { title: "Abonnement – CV maker" };

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  canceled: "Kansellert",
  past_due: "Betaling mislyktes",
  expired: "Utløpt",
};

const TYPE_LABEL: Record<string, string> = {
  monthly: "Månedlig (79 kr/mnd)",
  one_time: "Engangsbetaling (299 kr / 6 mnd)",
};

export default async function BillingPage() {
  const session = await getSession();
  if (!session) redirect("/logg-inn?redirect=/app/billing");

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.userId },
  });

  const active =
    sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-[#14110e]">Abonnement</h1>

      {active && sub ? (
        <Card variant="surface" radius="3xl" className="p-6">
          <dl className="grid grid-cols-1 gap-4 text-[14px] sm:grid-cols-2">
            <div>
              <dt className="text-[12px] text-black/55">Plan</dt>
              <dd className="mt-1 text-[#14110e]">{TYPE_LABEL[sub.type] ?? sub.type}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-black/55">Status</dt>
              <dd className="mt-1 text-[#14110e]">
                {STATUS_LABEL[sub.status] ?? sub.status}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[12px] text-black/55">
                {sub.type === "monthly"
                  ? sub.status === "trialing"
                    ? "Prøveperiode slutter"
                    : "Fornyes"
                  : "Tilgang utløper"}
              </dt>
              <dd className="mt-1 text-[#14110e]">
                {format(sub.currentPeriodEnd, "d. MMMM yyyy", { locale: nb })}
              </dd>
            </div>
          </dl>
          <div className="mt-6">
            <BillingPortalButton />
          </div>
        </Card>
      ) : (
        <>
          <Card variant="surface" radius="3xl" className="p-6 mb-8">
            <p className="text-[14px] text-[#14110e]">
              {sub
                ? "Abonnementet ditt er ikke aktivt. Velg en plan under for å komme i gang igjen."
                : "Du har ingen aktivt abonnement. Velg en plan under for å låse opp full tilgang."}
            </p>
          </Card>
          <PricingCards
            monthlyCta={
              <PricingCardButton
                priceId={process.env.STRIPE_PRICE_MONTHLY!}
                mode="subscription"
                label="Prøv gratis i 7 dager"
              />
            }
            oneTimeCta={
              <PricingCardButton
                priceId={process.env.STRIPE_PRICE_ONETIME!}
                mode="payment"
                label="Kjøp 6 måneder"
              />
            }
          />
        </>
      )}
    </main>
  );
}
