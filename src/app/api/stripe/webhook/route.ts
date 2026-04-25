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
          const seatLimit = sub.items.data[0]?.quantity ?? 1;
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              status: sub.status,
              seatLimit,
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
        // Update org subscriptions (status + seatLimit fra sub item quantity)
        const seatLimit = subscription.items.data[0]?.quantity ?? 1;
        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: subscription.status, seatLimit },
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

        // Clawback: alle pending entries for orger på denne subscription innen 90d
        const cutoff = new Date(Date.now() - 90 * 86_400_000);
        await prisma.commissionEntry.updateMany({
          where: {
            org: { stripeSubscriptionId: subscription.id },
            status: "pending",
            paidAt: { gte: cutoff },
          },
          data: { status: "clawback", notes: `Subscription canceled ${subscription.id}` },
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

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = extractSubscriptionId(invoice);
        if (!subscriptionId) break;

        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
          select: { id: true, salesRepId: true },
        });
        if (!org?.salesRepId) break;

        const existing = await prisma.commissionEntry.findUnique({
          where: { stripeInvoiceId: invoice.id ?? "" },
          select: { id: true },
        });
        if (existing || !invoice.id) break;

        const profile = await prisma.salesRepProfile.findUnique({
          where: { userId: org.salesRepId },
          select: { commissionRateBp: true },
        });
        const rateBp = profile?.commissionRateBp ?? 1000;

        const subtotal = typeof invoice.subtotal === "number" ? invoice.subtotal : 0;
        if (subtotal <= 0) break;

        const commissionCents = Math.floor((subtotal * rateBp) / 10_000);
        const transitions = (invoice as unknown as { status_transitions?: { paid_at?: number } }).status_transitions;
        const paidAt = new Date((transitions?.paid_at ?? Math.floor(Date.now() / 1000)) * 1000);
        const holdUntil = new Date(paidAt.getTime() + 90 * 86_400_000);

        await prisma.commissionEntry.create({
          data: {
            salesRepId: org.salesRepId,
            orgId: org.id,
            stripeInvoiceId: invoice.id,
            invoiceAmountCents: subtotal,
            amountCents: commissionCents,
            holdUntil,
            status: "pending",
            paidAt,
          },
        });

        await prisma.notification.create({
          data: {
            userId: org.salesRepId,
            title: `Provisjon registrert: ${(commissionCents / 100).toLocaleString("nb-NO")} kr`,
            body: `Faktura betalt. Frigis ${holdUntil.toLocaleDateString("nb-NO")}.`,
            url: `/selger/provisjon`,
          },
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const invoiceRef = (charge as unknown as { invoice?: string | { id: string } }).invoice;
        const invoiceId = typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;
        if (!invoiceId) break;

        const entry = await prisma.commissionEntry.findUnique({ where: { stripeInvoiceId: invoiceId } });
        if (!entry) break;

        const refundedRatio = charge.amount > 0 ? (charge.amount_refunded ?? 0) / charge.amount : 0;
        if (refundedRatio >= 0.99) {
          await prisma.commissionEntry.update({
            where: { id: entry.id },
            data: { status: "clawback", notes: `Charge refunded ${charge.id}` },
          });
          await prisma.notification.create({
            data: {
              userId: entry.salesRepId,
              title: `Clawback: ${(entry.amountCents / 100).toLocaleString("nb-NO")} kr`,
              body: `Faktura refundert — provisjon trukket tilbake.`,
              url: `/selger/provisjon`,
            },
          });
        } else if (refundedRatio > 0) {
          const remaining = Math.floor(entry.invoiceAmountCents * (1 - refundedRatio));
          const newCommission = Math.floor((remaining * 1000) / 10_000);
          await prisma.commissionEntry.update({
            where: { id: entry.id },
            data: {
              amountCents: newCommission,
              notes: `Partial refund ${(refundedRatio * 100).toFixed(0)}% (${charge.id})`,
            },
          });
        }
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
