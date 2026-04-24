import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });

  const { id, type, folderId } = await req.json().catch(() => ({}));
  if (!id || !type) return NextResponse.json({ error: "Mangler id/type" }, { status: 400 });

  if (type === "inbound") {
    await prisma.inboundEmail.update({ where: { id }, data: { folderId: folderId ?? null } });
  } else if (type === "sent") {
    await prisma.sentEmail.update({ where: { id }, data: { folderId: folderId ?? null } });
  } else {
    return NextResponse.json({ error: "Ugyldig type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
