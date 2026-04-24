import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/* ─── POST /api/sessions/[id]/reopen ────────────────────────
   Gjenåpner en avsluttet sesjon.
   409 hvis brukeren allerede har en annen ACTIVE sesjon.
────────────────────────────────────────────────────────────── */
export async function POST(_req: Request, { params }: Params) {
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
  if (jobSession.status === "ACTIVE") {
    return NextResponse.json({ error: "Sesjonen er allerede aktiv" }, { status: 409 });
  }

  const otherActive = await prisma.jobSearchSession.findFirst({
    where: { userId: session.userId, status: "ACTIVE", id: { not: id } },
    select: { id: true },
  });

  if (otherActive) {
    return NextResponse.json(
      { error: "Du har allerede én aktiv sesjon" },
      { status: 409 },
    );
  }

  const reopened = await prisma.jobSearchSession.update({
    where: { id },
    data: { status: "ACTIVE", closedAt: null, outcome: null, winningApplicationId: null },
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
  });

  return NextResponse.json(reopened);
}
