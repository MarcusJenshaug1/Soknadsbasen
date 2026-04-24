import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });

  const folders = await prisma.emailFolder.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true,
      _count: { select: { inboundEmails: true, sentEmails: true } },
    },
  });
  return NextResponse.json({ folders });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });

  const { name, parentId } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Navn mangler" }, { status: 400 });

  const folder = await prisma.emailFolder.create({
    data: { name: name.trim(), parentId: parentId ?? null },
  });
  return NextResponse.json({ folder });
}
