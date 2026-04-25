import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

async function resolveAdminOrg(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      stripeSubscriptionId: true,
      memberships: {
        where: { userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) return { error: "Ikke funnet", status: 404 as const };
  if (org.memberships[0].role !== "admin") return { error: "Krever admin-tilgang", status: 403 as const };
  if (!org.stripeSubscriptionId) return { error: "Ingen Stripe-abonnement", status: 400 as const };
  return { org };
}

/** Avslutt ved periodeslutt. */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const resolved = await resolveAdminOrg(slug, session.userId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  await stripe.subscriptions.update(resolved.org.stripeSubscriptionId!, {
    cancel_at_period_end: true,
  });
  return NextResponse.json({ ok: true });
}

/** Gjenoppta et abonnement som var satt til å avslutte. */
export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const resolved = await resolveAdminOrg(slug, session.userId);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  await stripe.subscriptions.update(resolved.org.stripeSubscriptionId!, {
    cancel_at_period_end: false,
  });
  return NextResponse.json({ ok: true });
}
