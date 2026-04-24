import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: query ? { email: { contains: query } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      subscription: { select: { status: true, type: true, currentPeriodEnd: true } },
      orgMemberships: {
        where: { status: "active" },
        select: { role: true, org: { select: { slug: true, displayName: true } } },
        take: 1,
      },
    },
  });

  return NextResponse.json({ users });
}
