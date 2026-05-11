import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/collab/invite/[id]
 * Revoke en invitasjon. Setter `revokedAt`, slik at:
 * - Aktive Hocuspocus-sesjoner forkastes ved neste auth-sjekk
 * - Nye join-forsøk avvises
 * - Pending suggestions blir værende (eier kan fortsatt accept/reject dem)
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

  const invite = await prisma.collabInvite.findFirst({
    where: { id, ownerId: session.userId },
    select: { id: true, revokedAt: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Finner ikke invitasjon" }, { status: 404 });
  }
  if (invite.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await prisma.$transaction([
    prisma.collabInvite.update({
      where: { id },
      data: { revokedAt: new Date() },
    }),
    // Marker alle aktive sesjoner som avsluttet — Hocuspocus-serveren
    // vil oppdage manglende validering ved neste re-auth og force-disconnecte.
    prisma.collabSession.updateMany({
      where: { inviteId: id, endedAt: null },
      data: { endedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
