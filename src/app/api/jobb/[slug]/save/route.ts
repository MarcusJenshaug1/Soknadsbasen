import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-request";
import { prisma } from "@/lib/prisma";
import { createDefaultSession } from "@/lib/session-context";
import { absoluteUrl } from "@/lib/seo/siteConfig";

type Params = Promise<{ slug: string }>;

async function findExisting(userId: string, slug: string, jobUrl: string) {
  return prisma.jobApplication.findFirst({
    where: {
      userId,
      OR: [{ jobUrl }, { jobUrl: `/jobb/${slug}` }],
    },
    select: { id: true, status: true },
  });
}

export async function GET(req: Request, ctx: { params: Params }) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ saved: false }, { status: 200 });
  }
  const { slug } = await ctx.params;
  const existing = await findExisting(session.userId, slug, absoluteUrl(`/jobb/${slug}`));
  return NextResponse.json({
    saved: Boolean(existing),
    id: existing?.id ?? null,
    status: existing?.status ?? null,
  });
}

export async function POST(req: Request, ctx: { params: Params }) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const { slug } = await ctx.params;
  const jobUrl = absoluteUrl(`/jobb/${slug}`);

  const existing = await findExisting(session.userId, slug, jobUrl);
  if (existing) {
    return NextResponse.json({ id: existing.id, status: existing.status, alreadySaved: true });
  }

  const job = await prisma.job.findUnique({
    where: { slug },
    select: {
      title: true,
      employerName: true,
      employerHomepage: true,
      description: true,
      applyUrl: true,
      sourceUrl: true,
      applicationDueAt: true,
      expiresAt: true,
      location: true,
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Stilling ikke funnet" }, { status: 404 });
  }

  let activeSession = await prisma.jobSearchSession.findFirst({
    where: { userId: session.userId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!activeSession) {
    activeSession = await createDefaultSession(session.userId);
  }

  const deadline = job.applicationDueAt ?? job.expiresAt ?? null;

  const created = await prisma.jobApplication.create({
    data: {
      userId: session.userId,
      sessionId: activeSession.id,
      title: job.title.slice(0, 250),
      companyName: job.employerName.slice(0, 200),
      companyWebsite: job.employerHomepage,
      source: "Søknadsbasen",
      jobUrl,
      jobDescription: job.description?.slice(0, 50_000) || null,
      deadlineAt: deadline,
      notes: job.location ? `Sted: ${job.location}` : null,
      status: "draft",
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
}

export async function DELETE(req: Request, ctx: { params: Params }) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const { slug } = await ctx.params;
  const existing = await findExisting(session.userId, slug, absoluteUrl(`/jobb/${slug}`));
  if (!existing) {
    return NextResponse.json({ removed: false });
  }
  // Only delete if it's still a draft. Once moved past draft we keep history.
  if (existing.status !== "draft") {
    return NextResponse.json(
      { removed: false, reason: "Søknaden er ikke lenger en draft" },
      { status: 409 },
    );
  }
  await prisma.jobApplication.delete({ where: { id: existing.id } });
  return NextResponse.json({ removed: true });
}
