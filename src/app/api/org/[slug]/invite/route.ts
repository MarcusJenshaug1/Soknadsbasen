import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail, buildOrgInviteEmail } from "@/lib/email";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      displayName: true,
      seatLimit: true,
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

  let body: { email: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Epost er påkrevd" }, { status: 400 });

  // Check if already an active member
  const existingMembership = await prisma.orgMembership.findFirst({
    where: {
      orgId: org.id,
      status: "active",
      user: { email },
    },
  });
  if (existingMembership) {
    return NextResponse.json({ error: "Brukeren er allerede et aktivt medlem" }, { status: 409 });
  }

  // Pool-sjekk: aktive medlemmer + unike ubetalte invitasjoner ≤ seatLimit.
  // OrgInvite opprettes for alle invitasjoner (med eller uten eksisterende bruker),
  // så vi teller dem som kilde-av-sannhet for "pending". Membership(status=invited)
  // er bare et speil av OrgInvite når brukeren finnes fra før.
  const [activeMembers, pendingInvites] = await Promise.all([
    prisma.orgMembership.count({
      where: { orgId: org.id, status: "active" },
    }),
    prisma.orgInvite.count({
      where: { orgId: org.id, expiresAt: { gt: new Date() } },
    }),
  ]);
  const seatsUsed = activeMembers + pendingInvites;
  if (seatsUsed >= org.seatLimit) {
    return NextResponse.json(
      {
        error: "Ingen ledige lisenser. Kjøp flere lisenser før du inviterer.",
        seatsUsed,
        seatLimit: org.seatLimit,
      },
      { status: 409 },
    );
  }

  const token = randomUUID();
  const expiresAt = addDays(new Date(), 7);

  // Upsert invite (refresh token if already pending)
  await prisma.orgInvite.upsert({
    where: { token: (await prisma.orgInvite.findFirst({ where: { orgId: org.id, email } }))?.token ?? token },
    create: { orgId: org.id, email, token, expiresAt },
    update: { token, expiresAt },
  });

  // If user exists, create invited membership immediately
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    await prisma.orgMembership.upsert({
      where: { orgId_userId: { orgId: org.id, userId: existingUser.id } },
      create: { orgId: org.id, userId: existingUser.id, role: "member", status: "invited" },
      update: { status: "invited" },
    });
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/inviter/${token}`;
  const { subject, html } = buildOrgInviteEmail({
    orgDisplayName: org.displayName,
    inviteUrl,
    inviterName: session.name,
  });
  await sendMail({ to: email, subject, html });

  return NextResponse.json({ ok: true });
}
