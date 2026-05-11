import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/collab/session/[id]
 * Eier-endpoint. Kicker en aktiv collab-sesjon.
 *
 * Setter `endedAt`. Hocuspocus-serveren oppdager dette ved neste
 * re-auth (typisk innen sekunder pga periodic JWKS-refresh) og
 * force-disconnecter klienten. Klient-side mottar disconnect-event og
 * viser KickedModal.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await params;

  // Eierskap-sjekk: hent sesjon og sjekk invite.ownerId.
  const found = await prisma.collabSession.findUnique({
    where: { id },
    select: {
      id: true,
      endedAt: true,
      invite: { select: { ownerId: true } },
    },
  });
  if (!found || found.invite.ownerId !== session.userId) {
    return NextResponse.json({ error: "Finner ikke sesjon" }, { status: 404 });
  }
  if (found.endedAt) {
    return NextResponse.json({ ok: true, alreadyEnded: true });
  }

  await prisma.collabSession.update({
    where: { id },
    data: { endedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
