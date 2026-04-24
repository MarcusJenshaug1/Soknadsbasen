import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; stageId: string }> };

async function getOwnedStage(stageId: string, appId: string, userId: string) {
  return prisma.interviewStage.findFirst({
    where: { id: stageId, applicationId: appId, application: { userId } },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  const { id, stageId } = await ctx.params;
  if (!await getOwnedStage(stageId, id, session.userId)) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const body = (await req.json()) as {
    type?: string;
    scheduledAt?: string | null;
    outcome?: string;
    notes?: string | null;
  };

  const stage = await prisma.interviewStage.update({
    where: { id: stageId },
    data: {
      ...(body.type !== undefined && { type: body.type }),
      ...(body.scheduledAt !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
      ...(body.outcome !== undefined && { outcome: body.outcome }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
  return NextResponse.json(stage);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  const { id, stageId } = await ctx.params;
  if (!await getOwnedStage(stageId, id, session.userId)) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  await prisma.interviewStage.delete({ where: { id: stageId } });
  return NextResponse.json({ ok: true });
}
