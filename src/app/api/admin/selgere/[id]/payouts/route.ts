import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(email: string, userId: string) {
  if (email === process.env.ADMIN_EMAIL) return true;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isAdmin: true } });
  return u?.role === "admin" || u?.isAdmin === true;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(session.email, session.userId))) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }
  const { id: profileId } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.entryIds) || body.entryIds.length === 0) {
    return NextResponse.json({ error: "entryIds påkrevd" }, { status: 400 });
  }

  const profile = await prisma.salesRepProfile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });
  if (!profile) return NextResponse.json({ error: "Selger ikke funnet" }, { status: 404 });

  const entries = await prisma.commissionEntry.findMany({
    where: {
      id: { in: body.entryIds },
      salesRepId: profile.userId,
      status: "eligible",
    },
    select: { id: true, amountCents: true },
  });
  if (entries.length === 0) {
    return NextResponse.json({ error: "Ingen gyldige entries (må være status=eligible)" }, { status: 400 });
  }

  const totalCents = entries.reduce((s, e) => s + e.amountCents, 0);
  const paymentRef = typeof body.paymentRef === "string" ? body.paymentRef : null;
  const notes = typeof body.notes === "string" ? body.notes : null;

  const payout = await prisma.$transaction(async (tx) => {
    const p = await tx.commissionPayout.create({
      data: {
        salesRepId: profile.userId,
        totalCents,
        paidAt: new Date(),
        paymentRef,
        notes,
        createdById: session.userId,
      },
    });
    await tx.commissionEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { status: "paid", payoutId: p.id },
    });
    return p;
  });

  await prisma.notification.create({
    data: {
      userId: profile.userId,
      title: `Provisjon utbetalt: ${(totalCents / 100).toLocaleString("nb-NO")} kr`,
      body: `${entries.length} entries inkludert${paymentRef ? ` · ref: ${paymentRef}` : ""}.`,
      url: `/selger/provisjon`,
    },
  });

  return NextResponse.json({ payoutId: payout.id, totalCents, count: entries.length });
}
