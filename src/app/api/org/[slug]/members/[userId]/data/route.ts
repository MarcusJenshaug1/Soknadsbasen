import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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
  if (org.memberships[0].role !== "admin") {
    return NextResponse.json({ error: "Krever admin-tilgang" }, { status: 403 });
  }

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId } },
    select: { sharesDataWithOrg: true, status: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Bruker er ikke aktivt medlem" }, { status: 404 });
  }
  if (!membership.sharesDataWithOrg) {
    return NextResponse.json({ error: "Bruker deler ikke data med organisasjonen" }, { status: 403 });
  }

  const [applications, resumes] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        title: true,
        status: true,
        applicationDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.resume.findMany({
      where: { userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ applications, resumes });
}
