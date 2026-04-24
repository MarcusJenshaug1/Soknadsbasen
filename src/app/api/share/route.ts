import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const link = await prisma.shareLink.findFirst({
    where: { userId: session.userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { token: true, expiresAt: true, createdAt: true, label: true },
  });

  return NextResponse.json({ link });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { label?: string };

  // Revoke any existing active links
  await prisma.shareLink.updateMany({
    where: { userId: session.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const link = await prisma.shareLink.create({
    data: {
      userId: session.userId,
      label: body.label?.trim() || null,
      expiresAt: new Date(Date.now() + DAYS_30),
    },
    select: { token: true, expiresAt: true, createdAt: true, label: true },
  });

  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  await prisma.shareLink.updateMany({
    where: { userId: session.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
