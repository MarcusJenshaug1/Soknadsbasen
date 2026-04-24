import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as {
    endpoint?: string;
    keys?: { auth?: string; p256dh?: string };
  };

  if (!body.endpoint || !body.keys?.auth || !body.keys?.p256dh) {
    return NextResponse.json({ error: "Ugyldig abonnement" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId: session.userId, endpoint: body.endpoint } },
    update: { auth: body.keys.auth, p256dh: body.keys.p256dh },
    create: {
      userId: session.userId,
      endpoint: body.endpoint,
      auth: body.keys.auth,
      p256dh: body.keys.p256dh,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as { endpoint?: string };
  if (!body.endpoint) return NextResponse.json({ error: "Mangler endpoint" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { userId: session.userId, endpoint: body.endpoint },
  });

  return NextResponse.json({ ok: true });
}
