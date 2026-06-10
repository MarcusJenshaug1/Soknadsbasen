import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tasks
 * Returns all tasks across the user's applications.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { application: { userId: session.userId } },
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      applicationId: true,
      title: true,
      dueAt: true,
      completedAt: true,
      type: true,
      priority: true,
      createdAt: true,
      application: {
        select: { id: true, companyName: true, title: true, status: true },
      },
    },
  });

  return NextResponse.json(tasks);
}

const TASK_TYPES = new Set(["followup", "document", "research", "interview", "other"]);
const TASK_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

/**
 * POST /api/tasks
 * Creates a task on one of the user's applications.
 * Body: { title, applicationId, dueAt?, type?, priority? }
 *
 * Tasks are FK-bound to an application (schema: Task.applicationId required),
 * so applicationId må følge med. Eierskap verifiseres før create.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  let body: {
    title?: unknown;
    applicationId?: unknown;
    dueAt?: unknown;
    type?: unknown;
    priority?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Tittel er påkrevd" }, { status: 400 });
  }

  const applicationId =
    typeof body.applicationId === "string" ? body.applicationId : "";
  if (!applicationId) {
    return NextResponse.json(
      { error: "Søknad er påkrevd" },
      { status: 400 },
    );
  }

  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId: session.userId },
    select: { id: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });
  }

  const type =
    typeof body.type === "string" && TASK_TYPES.has(body.type) ? body.type : null;
  const priority =
    typeof body.priority === "string" && TASK_PRIORITIES.has(body.priority)
      ? body.priority
      : "medium";

  let dueAt: Date | null = null;
  if (typeof body.dueAt === "string" && body.dueAt) {
    const parsed = new Date(body.dueAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Ugyldig frist" }, { status: 400 });
    }
    dueAt = parsed;
  }

  const task = await prisma.task.create({
    data: { applicationId, title, dueAt, type, priority },
    select: {
      id: true,
      applicationId: true,
      title: true,
      description: true,
      dueAt: true,
      completedAt: true,
      type: true,
      priority: true,
      createdAt: true,
      application: {
        select: { id: true, companyName: true, title: true, status: true },
      },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
