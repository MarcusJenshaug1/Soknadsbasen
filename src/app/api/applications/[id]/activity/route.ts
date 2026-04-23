import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/* ─── POST /api/applications/[id]/activity ────────────────
   Create a new activity entry for an application.
   Body: { type: string, note?: string, occurredAt?: string }
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
    type: string;
    note?: string;
    occurredAt?: string;
  };

  const activity = await prisma.applicationActivity.create({
    data: {
      applicationId: id,
      type: body.type,
      note: body.note ?? null,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
