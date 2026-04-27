import { NextResponse } from "next/server";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stageMeta } from "@/lib/sales/stages";

export async function GET() {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await prisma.lead.findMany({
    where: access.viewerRole === "admin" ? {} : { salesRepId: access.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      stage: true,
      probability: true,
      source: true,
      estimatedValueCents: true,
      expectedSeats: true,
      title: true,
      companyName: true,
      companyWebsite: true,
      orgId: true,
      closedAt: true,
      updatedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const companyName = String(body.companyName ?? "").trim();
  if (!companyName) return NextResponse.json({ error: "companyName påkrevd" }, { status: 400 });

  const stage = typeof body.stage === "string" ? body.stage : "Ny";
  const probability = stageMeta(stage).probability;

  // Admin uten egen selger-profil kan opprette på vegne av eksplisitt salesRepId; faller ellers til seg selv.
  let assignSalesRepId = access.userId;
  if (access.viewerRole === "admin" && typeof body.salesRepId === "string") {
    const target = await prisma.salesRepProfile.findUnique({
      where: { userId: body.salesRepId },
      select: { userId: true },
    });
    if (target) assignSalesRepId = target.userId;
  }

  const lead = await prisma.lead.create({
    data: {
      salesRepId: assignSalesRepId,
      stage,
      probability,
      source: typeof body.source === "string" ? body.source : "manual",
      estimatedValueCents: Number(body.estimatedValueCents) || 0,
      expectedSeats: Number(body.expectedSeats) || 1,
      title: String(body.title ?? companyName),
      companyName,
      companyWebsite: typeof body.companyWebsite === "string" ? body.companyWebsite : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    },
    select: { id: true },
  });

  if (body.contact && typeof body.contact === "object") {
    const c = body.contact as { name?: string; email?: string; phone?: string; title?: string; role?: string };
    if (c.name) {
      const contact = await prisma.crmContact.create({
        data: {
          name: String(c.name),
          email: c.email ? String(c.email) : null,
          phone: c.phone ? String(c.phone) : null,
          title: c.title ? String(c.title) : null,
        },
        select: { id: true },
      });
      await prisma.leadContactLink.create({
        data: {
          leadId: lead.id,
          contactId: contact.id,
          role: c.role ?? "Beslutningstaker",
          isPrimary: true,
        },
      });
    }
  }

  return NextResponse.json({ id: lead.id });
}
