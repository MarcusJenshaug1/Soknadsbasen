import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { IMPERSONATION_COOKIE } from "@/lib/auth";

const TTL_SECONDS = 60 * 60; // 1 time

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: { targetUserId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const targetUserId = body.targetUserId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "Mangler targetUserId" }, { status: 400 });
  }
  if (targetUserId === guard.userId) {
    return NextResponse.json({ error: "Kan ikke impersonere deg selv" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Fant ikke bruker" }, { status: 404 });
  }

  const hdrs = await headers();
  const ipAddress =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
  const userAgent = hdrs.get("user-agent") ?? null;

  // Avslutt eksisterende åpne sesjoner for samme admin slik at maks én er aktiv.
  await prisma.impersonationSession.updateMany({
    where: { adminUserId: guard.userId, endedAt: null },
    data: { endedAt: new Date() },
  });

  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
  const created = await prisma.impersonationSession.create({
    data: {
      adminUserId: guard.userId,
      targetUserId: target.id,
      expiresAt,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    },
    select: { id: true },
  });

  console.warn(
    `[impersonate] start admin=${guard.email} target=${target.email} session=${created.id}`,
  );

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, created.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });

  return NextResponse.json({ ok: true, expiresAt });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(IMPERSONATION_COOKIE)?.value;

  if (sessionId) {
    await prisma.impersonationSession.updateMany({
      where: { id: sessionId, endedAt: null },
      data: { endedAt: new Date() },
    });
    console.warn(`[impersonate] stop session=${sessionId}`);
  }

  cookieStore.delete(IMPERSONATION_COOKIE);
  return NextResponse.json({ ok: true });
}
