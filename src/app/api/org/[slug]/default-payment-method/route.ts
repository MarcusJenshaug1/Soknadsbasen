import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

/**
 * Setter gitt payment method som default på både customer og subscription.
 * Kalles etter at client har bekreftet SetupIntent via Stripe Elements.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  let body: { paymentMethodId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }
  if (!body.paymentMethodId) {
    return NextResponse.json({ error: "Mangler paymentMethodId" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }
  if (org.memberships[0].role !== "admin") {
    return NextResponse.json({ error: "Krever admin-tilgang" }, { status: 403 });
  }
  if (!org.stripeCustomerId) {
    return NextResponse.json({ error: "Ingen Stripe-kunde" }, { status: 400 });
  }

  // PaymentMethod attaches automatisk ved SetupIntent-confirm, men vi sikrer idempotent
  try {
    await stripe.paymentMethods.attach(body.paymentMethodId, {
      customer: org.stripeCustomerId,
    });
  } catch (err: unknown) {
    // Ignorer "already attached to this customer" — det er OK
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("already been attached")) throw err;
  }

  await stripe.customers.update(org.stripeCustomerId, {
    invoice_settings: { default_payment_method: body.paymentMethodId },
  });

  if (org.stripeSubscriptionId) {
    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      default_payment_method: body.paymentMethodId,
    });
  }

  return NextResponse.json({ ok: true });
}
