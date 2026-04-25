import { NextResponse } from "next/server";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["note", "task", "call", "meeting", "email"]);

async function canAccessLead(
  id: string,
  access: { userId: string; viewerRole: "selger" | "admin" },
) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { salesRepId: true },
  });
  if (!lead) return false;
  return access.viewerRole === "admin" || lead.salesRepId === access.userId;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canAccessLead(id, access))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const activities = await prisma.crmActivity.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ activities });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canAccessLead(id, access))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !ALLOWED.has(String(body.type))) {
    return NextResponse.json({ error: "Ugyldig type" }, { status: 400 });
  }
  const activity = await prisma.crmActivity.create({
    data: {
      leadId: id,
      type: String(body.type),
      title: typeof body.title === "string" ? body.title : null,
      content: typeof body.content === "string" ? body.content : null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      durationMin: typeof body.durationMin === "number" ? Math.floor(body.durationMin) : null,
      createdById: access.userId,
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ activity });
}
