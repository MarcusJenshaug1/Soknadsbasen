import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

let stripeSingleton: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

// Lazy proxy: Stripe-konstruktøren kaster uten STRIPE_SECRET_KEY, som ikke er
// tilgjengelig under `next build` (runtime-secret). Utsett konstruksjon til
// første bruk slik at modul-evalueringen ved build ikke krever nøkkelen.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe();
    const value = instance[prop as keyof Stripe];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export async function getOrCreateCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  return customer.id;
}

export async function getOrCreateOrgCustomer(
  orgId: string,
  orgName: string,
  adminEmail: string,
): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: orgName,
    email: adminEmail,
    metadata: { orgId },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
