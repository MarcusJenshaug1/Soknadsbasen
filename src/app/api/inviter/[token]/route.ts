import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      org: { select: { slug: true, displayName: true, logoUrl: true } },
    },
  });
  if (!invite) return NextResponse.json({ error: "Invitasjon ikke funnet" }, { status: 404 });
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitasjonen er utløpt" }, { status: 410 });
  }
  return NextResponse.json({ email: invite.email, org: invite.org });
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { token } = await ctx.params;
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: { select: { id: true, slug: true, stripeSubscriptionId: true } } },
  });
  if (!invite) return NextResponse.json({ error: "Invitasjon ikke funnet" }, { status: 404 });
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitasjonen er utløpt" }, { status: 410 });
  }
  if (invite.email.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Invitasjonen er ikke til denne kontoen" }, { status: 403 });
  }

  await prisma.orgMembership.upsert({
    where: { orgId_userId: { orgId: invite.org.id, userId: session.userId } },
    create: { orgId: invite.org.id, userId: session.userId, role: "member", status: "active" },
    update: { status: "active" },
  });

  await prisma.orgInvite.delete({ where: { token } });

  // Sync Stripe seat quantity
  if (invite.org.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(invite.org.stripeSubscriptionId);
      const item = sub.items.data[0];
      const activeCount = await prisma.orgMembership.count({
        where: { orgId: invite.org.id, status: "active" },
      });
      if (item) {
        await stripe.subscriptions.update(invite.org.stripeSubscriptionId, {
          items: [{ id: item.id, quantity: activeCount }],
          proration_behavior: "create_prorations",
        });
      }
    } catch (err) {
      console.error("[inviter/accept] Stripe quantity update failed:", err);
    }
  }

  return NextResponse.json({ ok: true, orgSlug: invite.org.slug });
}
