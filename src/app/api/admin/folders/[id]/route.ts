import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  const { id } = await ctx.params;
  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Navn mangler" }, { status: 400 });
  const folder = await prisma.emailFolder.update({ where: { id }, data: { name: name.trim() } });
  return NextResponse.json({ folder });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.emailFolder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
