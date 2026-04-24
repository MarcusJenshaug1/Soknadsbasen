import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const members = await prisma.orgMembership.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      status: true,
      sharesDataWithOrg: true,
      createdAt: true,
      user: { select: { id: true, email: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ members, callerRole: org.memberships[0].role });
}
