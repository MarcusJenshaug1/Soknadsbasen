import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/* ─── Ownership guard ──────────────────────────────────────── */
async function getOwnedApplication(id: string, userId: string) {
  return prisma.jobApplication.findFirst({
    where: { id, userId },
    include: {
      tasks: { orderBy: { dueAt: "asc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" } },
      company: { select: { id: true, name: true, website: true } },
      resumeSnapshot: { select: { id: true, versionNum: true, templateId: true, createdAt: true } },
    },
  });
}

/* ─── GET /api/applications/[id] ──────────────────────────── */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const application = await getOwnedApplication(id, session.userId);
  if (!application) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  return NextResponse.json(application);
}

/* ─── PATCH /api/applications/[id] ───────────────────────── */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const body = (await req.json()) as Partial<{
    companyName: string;
    companyWebsite: string | null;
    title: string;
    status: string;
    statusNote: string;
    source: string;
    jobUrl: string;
    companyId: string | null;
    resumeSnapshotId: string | null;
    deadlineAt: string | null;
    applicationDate: string | null;
    interviewAt: string | null;
    followUpAt: string | null;
    offerSalary: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    jobDescription: string;
    notes: string;
  }>;

  // If status changed, log an activity and update statusUpdatedAt
  const statusChanged = body.status !== undefined && body.status !== existing.status;

  const updated = await prisma.$transaction(async (tx) => {
    const app = await tx.jobApplication.update({
      where: { id },
      data: {
        ...(body.companyName !== undefined ? { companyName: body.companyName.trim() } : {}),
        ...("companyWebsite" in body ? { companyWebsite: body.companyWebsite || null } : {}),
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.status !== undefined ? { status: body.status, statusUpdatedAt: new Date() } : {}),
        ...(body.statusNote !== undefined ? { statusNote: body.statusNote } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
        ...(body.jobUrl !== undefined ? { jobUrl: body.jobUrl } : {}),
        ...("companyId" in body ? { companyId: body.companyId ?? null } : {}),
        ...("resumeSnapshotId" in body ? { resumeSnapshotId: body.resumeSnapshotId ?? null } : {}),
        ...("deadlineAt" in body
          ? { deadlineAt: body.deadlineAt ? new Date(body.deadlineAt) : null }
          : {}),
        ...("applicationDate" in body
          ? { applicationDate: body.applicationDate ? new Date(body.applicationDate) : null }
          : {}),
        ...("interviewAt" in body
          ? { interviewAt: body.interviewAt ? new Date(body.interviewAt) : null }
          : {}),
        ...("followUpAt" in body
          ? { followUpAt: body.followUpAt ? new Date(body.followUpAt) : null }
          : {}),
        ...(body.offerSalary !== undefined ? { offerSalary: body.offerSalary } : {}),
        ...(body.contactName !== undefined ? { contactName: body.contactName } : {}),
        ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail } : {}),
        ...(body.contactPhone !== undefined ? { contactPhone: body.contactPhone } : {}),
        ...(body.jobDescription !== undefined ? { jobDescription: body.jobDescription } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    if (statusChanged) {
      await tx.applicationActivity.create({
        data: {
          applicationId: id,
          type: "status",
          note: body.statusNote
            ? `${existing.status} → ${body.status}: ${body.statusNote}`
            : `${existing.status} → ${body.status}`,
        },
      });
    }

    return app;
  });

  const full = await getOwnedApplication(id, session.userId);
  return NextResponse.json(full ?? updated);
}

/* ─── DELETE /api/applications/[id] ──────────────────────── */
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  await prisma.jobApplication.delete({ where: { id } });
  return NextResponse.json({ message: "Søknad slettet" });
}
