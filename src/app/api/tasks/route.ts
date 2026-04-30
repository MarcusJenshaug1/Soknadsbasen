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
