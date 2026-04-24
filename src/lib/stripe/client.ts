"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Lazy-loader for Stripe.js. Laster kun én gang per session.
 * ~50kb ekstra JS når først kalt — ikke importer fra toppnivå.
 */
export function getStripeJs(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY mangler");
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
