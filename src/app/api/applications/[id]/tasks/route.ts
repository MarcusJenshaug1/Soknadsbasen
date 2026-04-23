import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/* ─── GET /api/applications/[id]/tasks ─────────────────────
   List all tasks for an application.
─────────────────────────────────────────────────────────── */
export async function GET(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;

  // Verify ownership
  const application = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
  });

  if (!application) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: { applicationId: id },
    orderBy: [
      { completedAt: "asc" }, // Incomplete first
      { dueAt: "asc" }, // Then by due date
    ],
  });

  return NextResponse.json(tasks);
}

/* ─── POST /api/applications/[id]/tasks ────────────────────
   Create a new task for an application.
   Body: { title: string, dueAt?: string, type?: string }
─────────────────────────────────────────────────────────── */
export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;

  // Verify ownership
  const application = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
  });

  if (!application) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const body = (await req.json()) as {
    title: string;
    dueAt?: string;
    type?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "Tittel er påkrevd" },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      applicationId: id,
      title: body.title,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      type: body.type ?? null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
