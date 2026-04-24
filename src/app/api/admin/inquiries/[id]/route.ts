import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: { status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const allowed = ["pending", "contacted", "dismissed"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
  }

  const updated = await prisma.orgInquiry.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json({ ok: true, inquiry: updated });
}
