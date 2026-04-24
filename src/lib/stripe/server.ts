import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
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
