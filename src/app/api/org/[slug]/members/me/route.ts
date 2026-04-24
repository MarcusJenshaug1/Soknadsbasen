import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
  if (!org) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  let body: { sharesDataWithOrg: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  await prisma.orgMembership.update({
    where: { orgId_userId: { orgId: org.id, userId: session.userId } },
    data: { sharesDataWithOrg: body.sharesDataWithOrg },
  });

  return NextResponse.json({ ok: true });
}
