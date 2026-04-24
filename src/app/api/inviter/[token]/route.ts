import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    include: { org: { select: { id: true, slug: true } } },
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

  // Pool-modellen: lisensen er allerede kjøpt av admin. Ingen Stripe-justering.

  return NextResponse.json({ ok: true, orgSlug: invite.org.slug });
}
