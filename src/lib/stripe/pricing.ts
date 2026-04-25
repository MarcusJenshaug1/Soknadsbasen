import { cache } from "react";
import { stripe } from "./server";

export type SeatPrice = {
  /** Minste valutaenhet (øre for NOK). */
  amount: number;
  currency: string;
  interval: "month" | "year";
  priceId: string;
};

/**
 * Henter gjeldende org-seat pris fra Stripe. Cache per request via React.cache.
 * Kilde-av-sannhet er Stripe — ikke hardkod priser i UI.
 */
export const getOrgSeatPrice = cache(async (): Promise<SeatPrice> => {
  const priceId = process.env.STRIPE_PRICE_ORG_SEAT;
  if (!priceId) throw new Error("STRIPE_PRICE_ORG_SEAT er ikke satt");
  const price = await stripe.prices.retrieve(priceId);
  return {
    amount: price.unit_amount ?? 0,
    currency: price.currency,
    interval: price.recurring?.interval === "year" ? "year" : "month",
    priceId,
  };
});

export function formatNok(oreAmount: number): string {
  return `${(oreAmount / 100).toLocaleString("nb-NO")} kr`;
}

export function formatOre(oreAmount: number, currency = "nok"): string {
  if (currency.toLowerCase() === "nok") return formatNok(oreAmount);
  return `${(oreAmount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}
