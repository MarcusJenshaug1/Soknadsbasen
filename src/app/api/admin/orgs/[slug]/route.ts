import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { slug } = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: {
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!org) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  return NextResponse.json({ org });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { slug } = await ctx.params;
  let body: { status?: string; logoUrl?: string | null; brandColor?: string | null; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { slug },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      ...(body.brandColor !== undefined && { brandColor: body.brandColor }),
      ...(body.displayName?.trim() && { displayName: body.displayName.trim() }),
    },
  });

  return NextResponse.json({ ok: true, org: updated });
}
