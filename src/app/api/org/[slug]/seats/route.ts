import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

/**
 * Endre antall kjøpte lisenser (Stripe sub quantity).
 * Minimum = antall aktive medlemmer (kan ikke gå under brukte).
 * Maximum = 100.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  let body: { newLimit: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const newLimit = Math.max(1, Math.min(100, Number(body.newLimit)));
  if (!Number.isFinite(newLimit)) {
    return NextResponse.json({ error: "Ugyldig antall" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
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
  if (!org.stripeSubscriptionId) {
    return NextResponse.json({ error: "Ingen Stripe-abonnement" }, { status: 400 });
  }

  const activeCount = await prisma.orgMembership.count({
    where: { orgId: org.id, status: "active" },
  });
  if (newLimit < activeCount) {
    return NextResponse.json(
      {
        error: `Kan ikke redusere under antall aktive medlemmer (${activeCount}). Fjern medlemmer først.`,
      },
      { status: 400 },
    );
  }

  const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const item = sub.items.data[0];
  if (!item) {
    return NextResponse.json({ error: "Mangler subscription item" }, { status: 500 });
  }

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    items: [{ id: item.id, quantity: newLimit }],
    proration_behavior: "create_prorations",
  });

  // Webhook vil oppdatere DB. Vi oppdaterer også optimistisk for umiddelbar UI-refresh.
  await prisma.organization.update({
    where: { id: org.id },
    data: { seatLimit: newLimit },
  });

  return NextResponse.json({ ok: true, seatLimit: newLimit });
}
