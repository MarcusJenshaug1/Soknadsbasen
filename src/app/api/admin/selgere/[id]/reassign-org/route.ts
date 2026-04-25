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
  if (!body || typeof body.orgId !== "string") {
    return NextResponse.json({ error: "orgId påkrevd" }, { status: 400 });
  }

  const profile = await prisma.salesRepProfile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });
  if (!profile) return NextResponse.json({ error: "Selger ikke funnet" }, { status: 404 });

  await prisma.organization.update({
    where: { id: body.orgId },
    data: { salesRepId: profile.userId },
  });

  return NextResponse.json({ ok: true });
}
