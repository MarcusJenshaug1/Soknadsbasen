import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(email: string, userId: string) {
  if (email === process.env.ADMIN_EMAIL) return true;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isAdmin: true } });
  return u?.role === "admin" || u?.isAdmin === true;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(session.email, session.userId))) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.commissionRateBp === "number") {
    data.commissionRateBp = Math.max(0, Math.min(10000, Math.floor(body.commissionRateBp)));
  }
  if (typeof body.monthlyQuotaCents === "number") {
    data.monthlyQuotaCents = Math.max(0, Math.floor(body.monthlyQuotaCents));
  }
  if (typeof body.status === "string" && ["invited", "active", "suspended"].includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.notes === "string" || body.notes === null) {
    data.notes = body.notes;
  }

  const updated = await prisma.salesRepProfile.update({ where: { id }, data });
  return NextResponse.json({ profile: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(session.email, session.userId))) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }
  const { id } = await ctx.params;
  // Soft-delete: status='suspended', behold all data.
  await prisma.salesRepProfile.update({ where: { id }, data: { status: "suspended" } });
  return NextResponse.json({ ok: true });
}
