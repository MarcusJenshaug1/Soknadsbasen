import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Body = {
  ids: string[];
  action: "archive" | "unarchive" | "delete" | "status";
  status?: string;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "Ingen søknader valgt" }, { status: 400 });
  }

  const where = { id: { in: body.ids }, userId: session.userId };

  switch (body.action) {
    case "archive":
      await prisma.jobApplication.updateMany({ where, data: { archivedAt: new Date() } });
      break;
    case "unarchive":
      await prisma.jobApplication.updateMany({ where, data: { archivedAt: null } });
      break;
    case "delete":
      await prisma.jobApplication.deleteMany({ where });
      break;
    case "status":
      if (!body.status) return NextResponse.json({ error: "Status mangler" }, { status: 400 });
      await prisma.jobApplication.updateMany({
        where,
        data: { status: body.status, statusUpdatedAt: new Date() },
      });
      break;
    default:
      return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: body.ids.length });
}
