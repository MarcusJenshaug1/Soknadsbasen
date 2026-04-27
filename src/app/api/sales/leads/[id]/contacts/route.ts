import { NextResponse } from "next/server";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canAccessLead(id, access))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name påkrevd" }, { status: 400 });
  }

  const role = ["Beslutningstaker", "Bruker", "Champion"].includes(body.role) ? body.role : "Bruker";
  const isPrimary = body.isPrimary === true;

  const result = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.leadContactLink.updateMany({
        where: { leadId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const contact = await tx.crmContact.create({
      data: {
        name: String(body.name),
        title: typeof body.title === "string" ? body.title : null,
        email: typeof body.email === "string" ? body.email : null,
        phone: typeof body.phone === "string" ? body.phone : null,
        linkedinUrl: typeof body.linkedinUrl === "string" ? body.linkedinUrl : null,
        notes: typeof body.notes === "string" ? body.notes : null,
      },
    });
    const link = await tx.leadContactLink.create({
      data: { leadId: id, contactId: contact.id, role, isPrimary },
    });
    return { contact, link };
  });

  return NextResponse.json(result);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canAccessLead(id, access))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const linkId = url.searchParams.get("linkId");
  if (!linkId) return NextResponse.json({ error: "linkId påkrevd" }, { status: 400 });
  await prisma.leadContactLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
