import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/* ─── GET /api/applications/[id]/cover-letter ─────────────
   Get the cover letter for an application (or null if none exists).
─────────────────────────────────────────────────────────── */
export async function GET(_req: Request, ctx: Ctx) {
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

  // Get cover letter separately to avoid type issues during migration
  const coverLetter = await (prisma as any).coverLetter.findUnique({
    where: { applicationId: id },
  });

  return NextResponse.json(coverLetter ?? null);
}

/* ─── PUT /api/applications/[id]/cover-letter ─────────────
   Create or update the cover letter for an application.
─────────────────────────────────────────────────────────── */
export async function PUT(req: Request, ctx: Ctx) {
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

  const body = (await req.json()) as Partial<{
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    senderLocation: string;
    recipientName: string;
    recipientTitle: string;
    companyAddress: string;
    date: string;
    subject: string;
    greeting: string;
    body: string;
    closing: string;
    fontFamily: string;
    accentColor: string;
    fontSize: string;
  }>;

  // Upsert: create if doesn't exist, update if it does (use any to bypass type cache)
  const coverLetter = await (prisma as any).coverLetter.upsert({
    where: { applicationId: id },
    create: {
      applicationId: id,
      senderName: body.senderName ?? null,
      senderEmail: body.senderEmail ?? null,
      senderPhone: body.senderPhone ?? null,
      senderLocation: body.senderLocation ?? null,
      recipientName: body.recipientName ?? null,
      recipientTitle: body.recipientTitle ?? null,
      companyAddress: body.companyAddress ?? null,
      date: body.date ?? null,
      subject: body.subject ?? null,
      greeting: body.greeting ?? null,
      body: body.body ?? null,
      closing: body.closing ?? null,
      fontFamily: body.fontFamily ?? "inter",
      accentColor: body.accentColor ?? "#4f46e5",
      fontSize: body.fontSize ?? "medium",
    },
    update: {
      ...(body.senderName !== undefined ? { senderName: body.senderName } : {}),
      ...(body.senderEmail !== undefined ? { senderEmail: body.senderEmail } : {}),
      ...(body.senderPhone !== undefined ? { senderPhone: body.senderPhone } : {}),
      ...(body.senderLocation !== undefined ? { senderLocation: body.senderLocation } : {}),
      ...(body.recipientName !== undefined ? { recipientName: body.recipientName } : {}),
      ...(body.recipientTitle !== undefined ? { recipientTitle: body.recipientTitle } : {}),
      ...(body.companyAddress !== undefined ? { companyAddress: body.companyAddress } : {}),
      ...(body.date !== undefined ? { date: body.date } : {}),
      ...(body.subject !== undefined ? { subject: body.subject } : {}),
      ...(body.greeting !== undefined ? { greeting: body.greeting } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.closing !== undefined ? { closing: body.closing } : {}),
      ...(body.fontFamily !== undefined ? { fontFamily: body.fontFamily } : {}),
      ...(body.accentColor !== undefined ? { accentColor: body.accentColor } : {}),
      ...(body.fontSize !== undefined ? { fontSize: body.fontSize } : {}),
    },
  });

  return NextResponse.json(coverLetter);
}
