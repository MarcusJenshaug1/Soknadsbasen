import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { stripe, getOrCreateCustomer } from "@/lib/stripe/server";

type Body = {
  priceId: string;
  mode: "subscription" | "payment";
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const { priceId, mode } = body;
  const monthly = process.env.STRIPE_PRICE_MONTHLY!;
  const oneTime = process.env.STRIPE_PRICE_ONETIME!;

  const valid =
    (priceId === monthly && mode === "subscription") ||
    (priceId === oneTime && mode === "payment");
  if (!valid) {
    return NextResponse.json({ error: "Ugyldig priceId/mode" }, { status: 400 });
  }

  const type = priceId === monthly ? "monthly" : "one_time";
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const customerId = await getOrCreateCustomer(session.userId, session.email);

    const checkout = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?success=1`,
      cancel_url: `${origin}/app/billing`,
      allow_promotion_codes: true,
      metadata: { userId: session.userId, type },
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: { userId: session.userId },
              trial_period_days: 7,
            },
          }
        : { payment_intent_data: { metadata: { userId: session.userId } } }),
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Mangler checkout-URL" }, { status: 500 });
    }
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Kunne ikke starte betaling" }, { status: 500 });
  }
}
