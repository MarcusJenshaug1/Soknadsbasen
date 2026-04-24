import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/* ─── GET /api/sessions/[id] ────────────────────────────────── */
export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await params;

  const jobSession = await prisma.jobSearchSession.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      name: true,
      status: true,
      outcome: true,
      winningApplicationId: true,
      startedAt: true,
      closedAt: true,
      notes: true,
      _count: { select: { applications: true } },
    },
  });

  if (!jobSession) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  return NextResponse.json(jobSession);
}

/* ─── PATCH /api/sessions/[id] ──────────────────────────────
   Body: { name?, notes? }
────────────────────────────────────────────────────────────── */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.jobSearchSession.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const body = (await req.json()) as { name?: string; notes?: string };
  const data: { name?: string; notes?: string } = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.notes !== undefined) data.notes = body.notes.trim() || undefined;

  const updated = await prisma.jobSearchSession.update({
    where: { id },
    data,
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

  return NextResponse.json(updated);
}
