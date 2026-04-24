import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

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
    return NextResponse.json({ error: "Ingen Stripe-kunde koblet til organisasjonen" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/org/${slug}/fakturering`,
  });

  return NextResponse.json({ url: portalSession.url });
}
