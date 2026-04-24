import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

/**
 * Oppretter en SetupIntent for å trygt samle inn kortinfo via Stripe Elements.
 * Kortet attaches til customer når SetupIntent bekreftes client-side.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      stripeCustomerId: true,
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

  const si = await stripe.setupIntents.create({
    customer: org.stripeCustomerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return NextResponse.json({ clientSecret: si.client_secret });
}
