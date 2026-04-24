import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
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

  return NextResponse.json(contacts);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    title?: string;
    company?: string;
    linkedinUrl?: string;
    email?: string;
    phone?: string;
    photoUrl?: string | null;
    notes?: string;
    lastContactedAt?: string | null;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      userId: session.userId,
      name: body.name.trim(),
      title: body.title?.trim() || null,
      company: body.company?.trim() || null,
      linkedinUrl: body.linkedinUrl?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      photoUrl: body.photoUrl || null,
      notes: body.notes?.trim() || null,
      lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : null,
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

  return NextResponse.json(contact, { status: 201 });
}
