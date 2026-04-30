import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-request";
import { prisma } from "@/lib/prisma";
import { createDefaultSession } from "@/lib/session-context";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { formatPhones } from "@/lib/jobs/format";

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
      region: true,
      address: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      contactTitle: true,
      engagementType: true,
      extent: true,
      sector: true,
      remote: true,
      positionCount: true,
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
  const phones = formatPhones(job.contactPhone);
  // contactPhone er én streng — hvis flere numre, slå sammen med " / "
  const contactPhoneStr = phones.length > 0 ? phones.join(" / ") : null;

  // Notes-blokk: sted, ansettelse, sektor — info som ellers blir borte
  // siden JobApplication ikke har egne felter for det.
  const noteLines: string[] = [];
  const stedLine = [job.address, job.location, job.region]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(", ");
  if (stedLine) noteLines.push(`Sted: ${stedLine}`);
  if (job.remote) noteLines.push(`Hjemmekontor: ${job.remote}`);
  const ansettelse = [job.engagementType, job.extent]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(" · ");
  if (ansettelse) noteLines.push(`Ansettelse: ${ansettelse}`);
  if (job.sector) noteLines.push(`Sektor: ${job.sector}`);
  if (job.positionCount && job.positionCount > 1) {
    noteLines.push(`Antall stillinger: ${job.positionCount}`);
  }
  if (job.contactTitle && job.contactName) {
    noteLines.push(`Kontaktperson: ${job.contactName} (${job.contactTitle})`);
  }

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
      contactName: job.contactName,
      contactEmail: job.contactEmail,
      contactPhone: contactPhoneStr,
      notes: noteLines.length > 0 ? noteLines.join("\n") : null,
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
