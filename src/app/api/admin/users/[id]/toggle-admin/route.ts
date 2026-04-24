import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { isAdmin: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  if (user.email === process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Kan ikke endre superadmin" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isAdmin: !user.isAdmin },
    select: { isAdmin: true },
  });

  return NextResponse.json({ ok: true, isAdmin: updated.isAdmin });
}
