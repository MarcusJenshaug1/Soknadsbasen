import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.email))
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });

  const { id } = await ctx.params;
  const { type, archived } = await req.json().catch(() => ({}));
  if (!type || archived === undefined)
    return NextResponse.json({ error: "Mangler type/archived" }, { status: 400 });

  if (type === "inbound") {
    await prisma.inboundEmail.update({ where: { id }, data: { archived } });
  } else if (type === "sent") {
    await prisma.sentEmail.update({ where: { id }, data: { archived } });
  } else {
    return NextResponse.json({ error: "Ugyldig type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.email))
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "inbound") {
    await prisma.inboundEmail.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } else if (type === "sent") {
    await prisma.sentEmail.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } else {
    return NextResponse.json({ error: "Ugyldig type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
