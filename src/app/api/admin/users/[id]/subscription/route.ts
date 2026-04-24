import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

const VALID_STATUSES = ["active", "trialing", "canceled", "past_due", "expired"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { id } = await params;

  const sub = await prisma.subscription.findUnique({
    where: { userId: id },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!sub) return NextResponse.json({ discount: null, reason: "no_sub" });
  if (sub.stripeCustomerId.startsWith("manual_")) {
    return NextResponse.json({ discount: null, reason: "no_stripe_link" });
  }

  // Serialize to plain object so we can inspect regardless of SDK type wrapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function pickCoupon(raw: Record<string, any>) {
    // Newer Stripe API versions use `discounts` (array); older use `discount` (object)
    const candidates: unknown[] = [];
    if (raw.discount) candidates.push(raw.discount);
    if (Array.isArray(raw.discounts)) candidates.push(...raw.discounts);

    for (const d of candidates) {
      if (!d || typeof d !== "object") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const disc = d as Record<string, any>;
      const coupon = disc.coupon ?? disc.promotion_code?.coupon;
      if (coupon && typeof coupon === "object" && coupon.id) {
        return {
          couponId: coupon.id as string,
          name: (coupon.name ?? coupon.id) as string,
          percentOff: (coupon.percent_off as number | null) ?? null,
          amountOff: coupon.amount_off ? (coupon.amount_off as number) / 100 : null,
          currency: (coupon.currency as string | null) ?? null,
        };
      }
    }
    return null;
  }

  try {
    // Check subscription-level discount first (most common when promo applied at checkout)
    if (sub.stripeSubscriptionId) {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId, {
        expand: ["discount.coupon", "discounts.coupon"],
      });
      const raw = JSON.parse(JSON.stringify(stripeSub));
      console.log("[admin/discount] sub raw keys:", Object.keys(raw), "discount:", JSON.stringify(raw.discount), "discounts:", JSON.stringify(raw.discounts));
      const d = pickCoupon(raw);
      if (d) return NextResponse.json({ discount: d });
    }

    // Fall back to customer-level discount
    const customer = await stripe.customers.retrieve(sub.stripeCustomerId, {
      expand: ["discount.coupon", "discounts.coupon"],
    });
    if (!customer.deleted) {
      const customerDiscount = pickCoupon(JSON.parse(JSON.stringify(customer)));
      if (customerDiscount) return NextResponse.json({ discount: customerDiscount });
    }

    // Last resort: check most recent completed checkout session (covers one_time payments)
    const sessions = await stripe.checkout.sessions.list({
      customer: sub.stripeCustomerId,
      limit: 5,
      expand: ["data.discounts.coupon", "data.discounts.promotion_code.coupon"],
    });
    for (const cs of sessions.data) {
      if (cs.payment_status !== "paid") continue;
      const raw = JSON.parse(JSON.stringify(cs));
      const d = pickCoupon(raw);
      if (d) return NextResponse.json({ discount: d });
    }

    return NextResponse.json({ discount: null });
  } catch (err) {
    console.error("[admin/discount] error:", err);
    return NextResponse.json({ discount: null });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { id } = await params;

  let body: {
    action: "grant" | "extend" | "cancel" | "set_status" | "set_type";
    months?: number;
    days?: number;
    status?: string;
    type?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, subscription: { select: { id: true, currentPeriodEnd: true, status: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  const existing = user.subscription;

  if (body.action === "grant") {
    const months = Math.max(1, body.months ?? 12);
    const end = new Date();
    end.setMonth(end.getMonth() + months);

    const sub = await prisma.subscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        stripeCustomerId: `manual_${id}`,
        type: body.type ?? "manual",
        status: "active",
        currentPeriodEnd: end,
      },
      update: {
        ...(body.type ? { type: body.type } : {}),
        status: "active",
        currentPeriodEnd: end,
      },
      select: { status: true, type: true, currentPeriodEnd: true },
    });
    return NextResponse.json({ ok: true, subscription: sub });
  }

  if (body.action === "extend") {
    if (!existing) {
      return NextResponse.json({ error: "Ingen aktiv abonnement å forlenge" }, { status: 400 });
    }
    const days = Math.max(1, body.days ?? 30);
    const base = existing.currentPeriodEnd > new Date() ? existing.currentPeriodEnd : new Date();
    const end = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    const sub = await prisma.subscription.update({
      where: { userId: id },
      data: { currentPeriodEnd: end, status: "active" },
      select: { status: true, type: true, currentPeriodEnd: true },
    });
    return NextResponse.json({ ok: true, subscription: sub });
  }

  if (body.action === "cancel") {
    if (!existing) {
      return NextResponse.json({ error: "Ingen abonnement å kansellere" }, { status: 400 });
    }
    const sub = await prisma.subscription.update({
      where: { userId: id },
      data: { status: "canceled", currentPeriodEnd: new Date() },
      select: { status: true, type: true, currentPeriodEnd: true },
    });
    return NextResponse.json({ ok: true, subscription: sub });
  }

  if (body.action === "set_status") {
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Ingen abonnement å oppdatere" }, { status: 400 });
    }
    const sub = await prisma.subscription.update({
      where: { userId: id },
      data: { status: body.status },
      select: { status: true, type: true, currentPeriodEnd: true },
    });
    return NextResponse.json({ ok: true, subscription: sub });
  }

  if (body.action === "set_type") {
    const VALID_TYPES = ["monthly", "one_time", "manual"];
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Ugyldig type" }, { status: 400 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Ingen abonnement å oppdatere" }, { status: 400 });
    }
    const sub = await prisma.subscription.update({
      where: { userId: id },
      data: { type: body.type },
      select: { status: true, type: true, currentPeriodEnd: true },
    });
    return NextResponse.json({ ok: true, subscription: sub });
  }

  return NextResponse.json({ error: "Ukjent handling" }, { status: 400 });
}
