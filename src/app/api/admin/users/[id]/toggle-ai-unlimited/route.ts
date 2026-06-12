import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

/**
 * POST /api/admin/users/[id]/toggle-ai-unlimited
 * Admin-satt evig AI-kvote per bruker (partnere, venner, kompensasjon).
 * Flagget leses av resolveQuotaContext i src/lib/ai/credits.ts.
 */
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
    select: { aiUnlimited: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { aiUnlimited: !user.aiUnlimited },
    select: { aiUnlimited: true },
  });

  return NextResponse.json({ ok: true, aiUnlimited: updated.aiUnlimited });
}
