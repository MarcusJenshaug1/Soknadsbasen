import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ─── GET /api/applications ────────────────────────────────
   Query params:
     status   – filter by status string
     search   – filter by company name or title (case-insensitive)
     sort     – "createdAt" | "updatedAt" | "statusUpdatedAt" (default: updatedAt desc)
─────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const sort = (searchParams.get("sort") ?? "updatedAt") as
    | "createdAt"
    | "updatedAt"
    | "statusUpdatedAt";

  const applications = await prisma.jobApplication.findMany({
    where: {
      userId: session.userId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search } },
              { title: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { [sort]: "desc" },
    include: {
      tasks: { orderBy: { dueAt: "asc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 5 },
      company: { select: { id: true, name: true, website: true } },
    },
  });

  return NextResponse.json(applications);
}

/* ─── POST /api/applications ───────────────────────────────
   Body: { companyName, title, status?, source?, jobUrl?,
           companyId?, resumeSnapshotId?, deadlineAt?, notes?,
           jobDescription? }
─────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const body = (await req.json()) as {
    companyName: string;
    title: string;
    status?: string;
    source?: string;
    jobUrl?: string;
    companyId?: string;
    resumeSnapshotId?: string;
    deadlineAt?: string;
    applicationDate?: string;
    notes?: string;
    jobDescription?: string;
  };

  if (!body.companyName?.trim() || !body.title?.trim()) {
    return NextResponse.json(
      { error: "companyName og title er påkrevd" },
      { status: 400 }
    );
  }

  const application = await prisma.jobApplication.create({
    data: {
      userId: session.userId,
      companyName: body.companyName.trim(),
      title: body.title.trim(),
      status: body.status ?? "draft",
      source: body.source ?? null,
      jobUrl: body.jobUrl ?? null,
      companyId: body.companyId ?? null,
      resumeSnapshotId: body.resumeSnapshotId ?? null,
      deadlineAt: body.deadlineAt ? new Date(body.deadlineAt) : null,
      applicationDate: body.applicationDate ? new Date(body.applicationDate) : null,
      notes: body.notes ?? null,
      jobDescription: body.jobDescription ?? null,
    },
    include: {
      tasks: true,
      activities: true,
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(application, { status: 201 });
}
