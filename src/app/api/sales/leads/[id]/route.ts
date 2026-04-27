import { NextResponse } from "next/server";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES, stageMeta } from "@/lib/sales/stages";

async function loadAccessibleLead(
  id: string,
  access: { userId: string; viewerRole: "selger" | "admin" },
) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, salesRepId: true, stage: true },
  });
  if (!lead) return null;
  if (access.viewerRole !== "admin" && lead.salesRepId !== access.userId) return null;
  return lead;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      contacts: { include: { contact: true } },
      activities: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true, email: true } } } },
      org: { select: { id: true, slug: true, displayName: true, status: true } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (access.viewerRole !== "admin" && lead.salesRepId !== access.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const owned = await loadAccessibleLead(id, access);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.stage === "string") {
    const valid = PIPELINE_STAGES.some((s) => s.id === body.stage);
    if (!valid) return NextResponse.json({ error: "Ugyldig stage" }, { status: 400 });
    data.stage = body.stage;
    data.probability = stageMeta(body.stage).probability;
    if (body.stage === "Vunnet" || body.stage === "Tapt") {
      data.closedAt = new Date();
    } else {
      data.closedAt = null;
    }
  }
  if (typeof body.probability === "number") data.probability = Math.max(0, Math.min(100, body.probability));
  if (typeof body.estimatedValueCents === "number") data.estimatedValueCents = Math.max(0, Math.floor(body.estimatedValueCents));
  if (typeof body.expectedSeats === "number") data.expectedSeats = Math.max(1, Math.floor(body.expectedSeats));
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.companyName === "string") data.companyName = body.companyName;
  if (typeof body.companyWebsite === "string" || body.companyWebsite === null) data.companyWebsite = body.companyWebsite;
  if (typeof body.notes === "string" || body.notes === null) data.notes = body.notes;
  if (typeof body.lostReason === "string" || body.lostReason === null) data.lostReason = body.lostReason;

  const updated = await prisma.lead.update({
    where: { id },
    data,
    select: { id: true, stage: true, probability: true },
  });
  return NextResponse.json({ lead: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const owned = await loadAccessibleLead(id, access);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
