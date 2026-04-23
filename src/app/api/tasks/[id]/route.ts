import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/* ─── PUT /api/tasks/[id] ───────────────────────────────────
   Update a task (typically to mark as complete or change due date).
   Body: { title?, dueAt?, completedAt?, type?, description?, priority? }
─────────────────────────────────────────────────────────── */
export async function PUT(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;

  // Verify ownership via application
  const task = await prisma.task.findFirst({
    where: { id },
    include: { application: { select: { userId: true } } },
  });

  if (!task || task.application.userId !== session.userId) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const body = (await req.json()) as {
    title?: string;
    dueAt?: string | null;
    completedAt?: string | null;
    type?: string | null;
    description?: string | null;
    priority?: string;
  };

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.dueAt !== undefined
        ? { dueAt: body.dueAt ? new Date(body.dueAt) : null }
        : {}),
      ...(body.completedAt !== undefined
        ? { completedAt: body.completedAt ? new Date(body.completedAt) : null }
        : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
    },
  });

  return NextResponse.json(updated);
}

/* ─── DELETE /api/tasks/[id] ────────────────────────────────
   Delete a task permanently.
─────────────────────────────────────────────────────────── */
export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;

  // Verify ownership via application
  const task = await prisma.task.findFirst({
    where: { id },
    include: { application: { select: { userId: true } } },
  });

  if (!task || task.application.userId !== session.userId) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
