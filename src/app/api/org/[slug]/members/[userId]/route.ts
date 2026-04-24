import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ slug: string; userId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug, userId } = await ctx.params;

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

  const isAdmin = org.memberships[0].role === "admin";
  const isSelf = session.userId === userId;
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  // Guard: cannot remove last admin
  if (isAdmin && session.userId === userId) {
    const adminCount = await prisma.orgMembership.count({
      where: { orgId: org.id, role: "admin", status: "active" },
    });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Kan ikke fjerne siste administrator" }, { status: 400 });
    }
  }

  await prisma.orgMembership.update({
    where: { orgId_userId: { orgId: org.id, userId } },
    data: { status: "suspended" },
  });

  // Pool-modellen: lisensen frigjøres i poolen, men Stripe sub quantity endres ikke.
  // Admin må selv redusere lisensantallet via /api/org/[slug]/seats hvis ønsket.

  return NextResponse.json({ ok: true });
}
