import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedApp(id: string, userId: string) {
  return prisma.jobApplication.findFirst({ where: { id, userId }, select: { id: true } });
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  const { id } = await ctx.params;
  if (!await getOwnedApp(id, session.userId)) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const stages = await prisma.interviewStage.findMany({
    where: { applicationId: id },
    orderBy: { round: "asc" },
  });
  return NextResponse.json(stages);
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  const { id } = await ctx.params;
  if (!await getOwnedApp(id, session.userId)) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const body = (await req.json()) as { type?: string; scheduledAt?: string | null; notes?: string | null };

  const last = await prisma.interviewStage.findFirst({
    where: { applicationId: id },
    orderBy: { round: "desc" },
    select: { round: true },
  });

  const stage = await prisma.interviewStage.create({
    data: {
      applicationId: id,
      round: (last?.round ?? 0) + 1,
      type: body.type ?? "other",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(stage, { status: 201 });
}
