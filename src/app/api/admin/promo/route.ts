import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe/server";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const codes = await stripe.promotionCodes.list({
    limit: 100,
    expand: ["data.coupon"],
  });

  return NextResponse.json({ codes: codes.data });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  let body: {
    code: string;
    type: "percent" | "amount";
    value: number;
    duration: "once" | "repeating" | "forever";
    durationMonths?: number;
    maxRedemptions?: number;
    expiresAt?: string;
    appliesTo: "all" | "individual" | "org";
    firstTimeOnly: boolean;
    minimumAmount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  // STRIPE_PRODUCT_INDIVIDUAL may be comma-separated (monthly,onetime are separate products)
  const individualProducts = (process.env.STRIPE_PRODUCT_INDIVIDUAL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const productMap: Record<string, string[]> = {
    individual: individualProducts,
    org: process.env.STRIPE_PRODUCT_ORG ? [process.env.STRIPE_PRODUCT_ORG] : [],
  };

  const applies_to =
    body.appliesTo !== "all" && productMap[body.appliesTo]?.length
      ? { products: productMap[body.appliesTo] }
      : undefined;

  const coupon = await stripe.coupons.create({
    ...(body.type === "percent"
      ? { percent_off: body.value }
      : { amount_off: body.value * 100, currency: "nok" }),
    duration: body.duration,
    ...(body.duration === "repeating" && body.durationMonths
      ? { duration_in_months: body.durationMonths }
      : {}),
    ...(applies_to ? { applies_to } : {}),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promoCode = await (stripe.promotionCodes.create as any)({
    coupon: coupon.id,
    code: body.code.toUpperCase(),
    ...(body.maxRedemptions ? { max_redemptions: body.maxRedemptions } : {}),
    ...(body.expiresAt ? { expires_at: Math.floor(new Date(body.expiresAt).getTime() / 1000) } : {}),
    restrictions: {
      first_time_transaction: body.firstTimeOnly,
      ...(body.minimumAmount ? { minimum_amount: body.minimumAmount, minimum_amount_currency: "nok" } : {}),
    },
  });

  return NextResponse.json({ ok: true, id: promoCode.id, code: promoCode.code });
}
