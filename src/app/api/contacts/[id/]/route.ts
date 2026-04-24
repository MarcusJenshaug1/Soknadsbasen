import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.contact.findUnique({
    where: { id: params.id },
  });

  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      name: body.name ?? existing.name,
      title: body.title ?? existing.title,
      company: body.company ?? existing.company,
      linkedinUrl: body.linkedinUrl ?? existing.linkedinUrl,
      email: body.email ?? existing.email,
      phone: body.phone ?? existing.phone,
      photoUrl: body.photoUrl ?? existing.photoUrl,
      notes: body.notes ?? existing.notes,
      lastContactedAt: body.lastContactedAt ?? existing.lastContactedAt,
    },
    select: {
      id: true,
      name: true,
      title: true,
      company: true,
      linkedinUrl: true,
      email: true,
      phone: true,
      photoUrl: true,
      notes: true,
      lastContactedAt: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.contact.findUnique({
    where: { id: params.id },
  });

  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.contact.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ ok: true });
}
