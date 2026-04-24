import { NextResponse } from "next/server";
import { addMonths } from "date-fns";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Mangler signatur" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      raw,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe/webhook] Signatur-verifisering feilet:", err);
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const type = session.metadata?.type as "monthly" | "one_time" | "org" | undefined;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (!type || !customerId) {
          console.warn("[stripe/webhook] mangler metadata", { type, customerId });
          break;
        }

        if (type === "org") {
          const orgId = session.metadata?.orgId;
          if (!orgId) break;
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          if (!subscriptionId) break;

          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              status: sub.status,
            },
          });
          break;
        }

        const userId = session.metadata?.userId;
        if (!userId) break;

        if (type === "monthly") {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          if (!subscriptionId) break;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = getSubscriptionPeriodEnd(subscription);

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              type: "monthly",
              status: subscription.status,
              currentPeriodEnd: periodEnd,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              type: "monthly",
              status: subscription.status,
              currentPeriodEnd: periodEnd,
            },
          });
        } else {
          const periodEnd = addMonths(new Date(), 6);
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: null,
              type: "one_time",
              status: "active",
              currentPeriodEnd: periodEnd,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: null,
              type: "one_time",
              status: "active",
              currentPeriodEnd: periodEnd,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const periodEnd = getSubscriptionPeriodEnd(subscription);
        // Update personal subscriptions
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: subscription.status, currentPeriodEnd: periodEnd },
        });
        // Update org subscriptions
        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: subscription.status },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled" },
        });
        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = extractSubscriptionId(invoice);
        if (!subscriptionId) break;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "past_due" },
        });
        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "past_due" },
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date {
  const item = sub.items.data[0];
  const epoch =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  if (typeof epoch !== "number") {
    return addMonths(new Date(), 1);
  }
  return new Date(epoch * 1000);
}

function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as unknown as { subscription?: string | { id: string } })
    .subscription;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}
