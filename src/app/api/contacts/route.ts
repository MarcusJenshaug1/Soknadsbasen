import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const contact = await prisma.contact.create({
    data: {
      userId: session.userId,
      name: body.name,
      title: body.title,
      company: body.company,
      linkedinUrl: body.linkedinUrl,
      email: body.email,
      phone: body.phone,
      photoUrl: body.photoUrl,
      notes: body.notes,
      lastContactedAt: body.lastContactedAt,
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
