import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listResumesFromPayload } from "@/lib/resume-server";

/**
 * Hoved-CV for stillingsmatching. Skriver KUN UserData.mainResumeId —
 * aldri resumeData-payloaden (den er klient-eid via Yjs/cloud-sync).
 * resumeId null = tilbakestill til «bruk aktiv CV».
 */

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { mainResumeId: true },
  });
  return NextResponse.json({ mainResumeId: userData?.mainResumeId ?? null });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  let body: { resumeId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }
  if (body.resumeId !== null && typeof body.resumeId !== "string") {
    return NextResponse.json({ error: "resumeId må være string eller null" }, { status: 400 });
  }

  if (typeof body.resumeId === "string") {
    const userData = await prisma.userData.findUnique({
      where: { userId: session.userId },
      select: { resumeData: true },
    });
    const known = listResumesFromPayload(userData?.resumeData).some(
      (r) => r.id === body.resumeId,
    );
    if (!known) {
      return NextResponse.json({ error: "CV-en finnes ikke" }, { status: 400 });
    }
  }

  await prisma.userData.updateMany({
    where: { userId: session.userId },
    data: { mainResumeId: (body.resumeId as string | null) ?? null },
  });

  return NextResponse.json({ ok: true, mainResumeId: body.resumeId ?? null });
}
