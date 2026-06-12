import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveSession } from "@/lib/session-context";
import { prisma } from "@/lib/prisma";

const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

const LINK_SELECT = {
  token: true,
  expiresAt: true,
  createdAt: true,
  label: true,
  session: { select: { name: true } },
} as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const link = await prisma.shareLink.findFirst({
    where: { userId: session.userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: LINK_SELECT,
  });

  return NextResponse.json({ link });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { label?: string };

  // Lenken bindes til aktiv sesjon: visningen på /delt scopes til den, så
  // senere sesjoner ikke eksponeres automatisk. Uten aktiv sesjon (legacy-
  // brukere) blir lenken konto-vid som før.
  const activeJobSession = await getActiveSession();

  // Revoke any existing active links
  await prisma.shareLink.updateMany({
    where: { userId: session.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const link = await prisma.shareLink.create({
    data: {
      userId: session.userId,
      label: body.label?.trim() || null,
      sessionId: activeJobSession?.id ?? null,
      expiresAt: new Date(Date.now() + DAYS_30),
    },
    select: LINK_SELECT,
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
