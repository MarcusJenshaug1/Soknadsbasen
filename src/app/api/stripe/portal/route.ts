import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.userId },
    select: { stripeCustomerId: true },
  });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "Ingen aktiv kundeprofil" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/app/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: "Kunne ikke åpne kundeportal" }, { status: 500 });
  }
}
