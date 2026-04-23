import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/* ─── POST /api/applications/[id]/activity ────────────────
   Create a new activity entry for an application.
   Body: {
     type: string,        // "status" | "communication" | "note" | …
     note?: string,
     occurredAt?: string,
     direction?: "outbound" | "inbound",
     channel?: "email" | "sms" | "call" | "meeting" | "linkedin" | "other"
   }
─────────────────────────────────────────────────────────── */
export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const application = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
  });
  if (!application) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const body = (await req.json()) as {
    type: string;
    note?: string;
    occurredAt?: string;
    direction?: "outbound" | "inbound";
    channel?: string;
  };

  const activity = await prisma.applicationActivity.create({
    data: {
      applicationId: id,
      type: body.type,
      note: body.note ?? null,
      direction: body.direction ?? null,
      channel: body.channel ?? null,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    },
  });

  return NextResponse.json(activity, { status: 201 });
}

/* ─── DELETE /api/applications/[id]/activity?eventId=… ─── */
export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId mangler" }, { status: 400 });
  }

  const application = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
  });
  if (!application) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }
  await prisma.applicationActivity.deleteMany({
    where: { id: eventId, applicationId: id },
  });
  return NextResponse.json({ ok: true });
}
