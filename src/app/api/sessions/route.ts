import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDefaultSession } from "@/lib/session-context";

/* ─── GET /api/sessions ────────────────────────────────────── */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const sessions = await prisma.jobSearchSession.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      name: true,
      status: true,
      outcome: true,
      startedAt: true,
      closedAt: true,
      notes: true,
      _count: { select: { applications: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(sessions);
}

/* ─── POST /api/sessions ────────────────────────────────────
   Body: { name?, notes? }
   Oppretter ny sesjon. Avviser hvis ACTIVE allerede finnes.
────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const existing = await prisma.jobSearchSession.findFirst({
    where: { userId: session.userId, status: "ACTIVE" },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Du har allerede én aktiv sesjon" },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    notes?: string;
  };

  const now = new Date();
  const monthNames = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Desember",
  ];
  const defaultName = `Jobbsøk ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const newSession = await prisma.jobSearchSession.create({
    data: {
      userId: session.userId,
      name: body.name?.trim() || defaultName,
      notes: body.notes?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      status: true,
      outcome: true,
      startedAt: true,
      closedAt: true,
      notes: true,
    },
  });

  // Tilordne alle søknader uten sesjon til den nye (migrering av eksisterende brukere)
  await prisma.jobApplication.updateMany({
    where: { userId: session.userId, sessionId: null },
    data: { sessionId: newSession.id },
  });

  const count = await prisma.jobApplication.count({
    where: { sessionId: newSession.id },
  });

  return NextResponse.json(
    { ...newSession, _count: { applications: count } },
    { status: 201 },
  );
}

// Eksportert for bruk fra andre ruter
export { createDefaultSession };
