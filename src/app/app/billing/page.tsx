import { redirect } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { getSessionUserId } from "@/lib/auth";
import { getAiQuotaStatus } from "@/lib/ai/credits";
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
  const userId = await getSessionUserId();
  if (!userId) redirect("/logg-inn?redirect=/app/billing");

  const [sub, quota] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    getAiQuotaStatus(userId),
  ]);

  const active =
    sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date();

  // Org-medlemmer, trial og betalende har målt kvote; admin/selger/aiUnlimited
  // er unlimited og trenger verken meter eller kjøpsknapper.
  const hasMeteredAccess = !quota.unlimited && quota.allowance > 0;
  const topup50 = process.env.STRIPE_PRICE_AI_50;
  const topup100 = process.env.STRIPE_PRICE_AI_100;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Abonnement</h1>

      {active && sub ? (
        <Card variant="surface" radius="3xl" className="p-6">
          <dl className="grid grid-cols-1 gap-4 text-[14px] sm:grid-cols-2">
            <div>
              <dt className="text-[12px] text-black/55 dark:text-white/55">Plan</dt>
              <dd className="mt-1 text-ink">{TYPE_LABEL[sub.type] ?? sub.type}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-black/55 dark:text-white/55">Status</dt>
              <dd className="mt-1 text-ink">
                {STATUS_LABEL[sub.status] ?? sub.status}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[12px] text-black/55 dark:text-white/55">
                {sub.type === "monthly"
                  ? sub.status === "trialing"
                    ? "Prøveperiode slutter"
                    : "Fornyes"
                  : "Tilgang utløper"}
              </dt>
              <dd className="mt-1 text-ink">
                {format(sub.currentPeriodEnd, "d. MMMM yyyy", { locale: nb })}
              </dd>
            </div>
          </dl>
          <div className="mt-6">
            <BillingPortalButton />
          </div>
        </Card>
      ) : hasMeteredAccess ? (
        <Card variant="surface" radius="3xl" className="p-6">
          <p className="text-[14px] text-ink">
            Tilgangen din kommer via organisasjonen din — ingen eget abonnement
            å administrere her.
          </p>
        </Card>
      ) : (
        <>
          <Card variant="surface" radius="3xl" className="p-6 mb-8">
            <p className="text-[14px] text-ink">
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

      {hasMeteredAccess && (
          <Card variant="surface" radius="3xl" className="mt-6 p-6">
            <h2 className="text-[15px] font-medium text-ink mb-1">AI-kreditter</h2>
            <p className="text-[12px] text-black/55 dark:text-white/55 mb-4">
              Søknadsbrev, CV-gjennomgang, tilpasset CV og andre AI-funksjoner
              bruker én kreditt per kjøring. Nøkkelord og ATS-sjekk er gratis.
            </p>

            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-[14px] text-ink">
                <strong className="font-semibold tabular-nums">
                  {quota.monthlyRemaining}
                </strong>{" "}
                av {quota.allowance} igjen
                {quota.extra > 0 && (
                  <span className="text-black/55 dark:text-white/55">
                    {" "}
                    + {quota.extra} ekstra
                  </span>
                )}
              </span>
              {quota.resetsAt && (
                <span className="text-[11.5px] text-black/45 dark:text-white/45">
                  {quota.isTrial ? "Prøveperioden ut" : "Fylles på"}{" "}
                  {format(new Date(quota.resetsAt), "d. MMMM", { locale: nb })}
                </span>
              )}
            </div>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={quota.allowance}
              aria-valuenow={quota.monthlyRemaining}
              aria-label="Gjenstående AI-kreditter denne perioden"
              className="h-[6px] overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${quota.allowance > 0 ? Math.round((quota.monthlyRemaining / quota.allowance) * 100) : 0}%`,
                }}
              />
            </div>

            {(topup50 || topup100) && (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {topup50 && (
                  <PricingCardButton
                    priceId={topup50}
                    mode="payment"
                    label="50 AI-kreditter – 29 kr"
                  />
                )}
                {topup100 && (
                  <PricingCardButton
                    priceId={topup100}
                    mode="payment"
                    label="100 AI-kreditter – 49 kr"
                  />
                )}
              </div>
            )}
            <p className="mt-2 text-[11.5px] text-black/45 dark:text-white/45">
              Kjøpte kreditter brukes når månedskvoten er tom, og utløper aldri.
            </p>
          </Card>
      )}
    </main>
  );
}
