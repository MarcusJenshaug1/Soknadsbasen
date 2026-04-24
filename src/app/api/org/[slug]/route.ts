import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOrgWithMembership(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: {
        where: { userId, status: "active" },
        select: { role: true },
      },
      _count: { select: { memberships: { where: { status: "active" } } } },
    },
  });
  return org;
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const org = await getOrgWithMembership(slug, session.userId);
  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  return NextResponse.json({
    id: org.id,
    slug: org.slug,
    name: org.name,
    displayName: org.displayName,
    logoUrl: org.logoUrl,
    brandColor: org.brandColor,
    status: org.status,
    seatCount: org._count.memberships,
    role: org.memberships[0].role,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const org = await getOrgWithMembership(slug, session.userId);
  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }
  if (org.memberships[0].role !== "admin") {
    return NextResponse.json({ error: "Krever admin-tilgang" }, { status: 403 });
  }

  let body: Partial<{ displayName: string; name: string; logoUrl: string; brandColor: string }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      ...(body.brandColor !== undefined && { brandColor: body.brandColor }),
    },
  });

  return NextResponse.json({ ok: true, org: updated });
}
