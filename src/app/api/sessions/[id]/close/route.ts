import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/* ─── POST /api/sessions/[id]/close ─────────────────────────
   Body: { outcome: "GOT_JOB" | "PAUSE" | "OTHER",
           winningApplicationId?: string,
           notes?: string }
   Lukker sesjon. Draft-søknader arkiveres automatisk i transaction.
────────────────────────────────────────────────────────────── */
export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await params;

  const jobSession = await prisma.jobSearchSession.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, status: true },
  });

  if (!jobSession) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }
  if (jobSession.status === "CLOSED") {
    return NextResponse.json({ error: "Sesjonen er allerede avsluttet" }, { status: 409 });
  }

  const body = (await req.json()) as {
    outcome: "GOT_JOB" | "PAUSE" | "OTHER";
    winningApplicationId?: string;
    notes?: string;
  };

  if (!["GOT_JOB", "PAUSE", "OTHER"].includes(body.outcome)) {
    return NextResponse.json({ error: "Ugyldig utfall" }, { status: 400 });
  }

  const now = new Date();

  const [closed] = await prisma.$transaction([
    // Lukk sesjon
    prisma.jobSearchSession.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: now,
        outcome: body.outcome,
        winningApplicationId: body.winningApplicationId ?? null,
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
        _count: { select: { applications: true } },
      },
    }),
    // Auto-arkiver draft-søknader i sesjonen
    prisma.jobApplication.updateMany({
      where: { sessionId: id, status: "draft", archivedAt: null },
      data: { archivedAt: now },
    }),
  ]);

  return NextResponse.json(closed);
}
