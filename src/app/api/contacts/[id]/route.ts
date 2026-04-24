import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    title?: string | null;
    company?: string | null;
    linkedinUrl?: string | null;
    email?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
    notes?: string | null;
    lastContactedAt?: string | null;
  };

  const existing = await prisma.contact.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.title !== undefined && { title: body.title?.trim() || null }),
      ...(body.company !== undefined && { company: body.company?.trim() || null }),
      ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl?.trim() || null }),
      ...(body.email !== undefined && { email: body.email?.trim() || null }),
      ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
      ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl || null }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...(body.lastContactedAt !== undefined && {
        lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : null,
      }),
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.contact.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
