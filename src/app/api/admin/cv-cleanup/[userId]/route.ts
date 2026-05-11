import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/cv-cleanup/[userId]
 * Returnerer full UserData-rad for inspeksjon før reset.
 * Admin-guarded så ingen-admin kan lekke andre brukeres CV via denne.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { userId } = await params;

  const [user, data] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    }),
    prisma.userData.findUnique({
      where: { userId },
      select: { resumeData: true, coverLetterData: true, updatedAt: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  return NextResponse.json({
    user,
    resumeData: safeJson(data?.resumeData),
    coverLetterData: safeJson(data?.coverLetterData),
    updatedAt: data?.updatedAt ? data.updatedAt.toISOString() : null,
  });
}

function safeJson(raw: string | undefined | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
