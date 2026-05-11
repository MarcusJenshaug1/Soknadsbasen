import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/collab/invite/[id]/sessions
 * List aktive collab-sesjoner for en invite. Brukes av eier-UI for å
 * vise hvem som er live + kick-knapper.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await params;

  // Verifiser eierskap.
  const invite = await prisma.collabInvite.findFirst({
    where: { id, ownerId: session.userId },
    select: { id: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Finner ikke invitasjon" }, { status: 404 });
  }

  const sessions = await prisma.collabSession.findMany({
    where: { inviteId: id },
    orderBy: { connectedAt: "desc" },
    take: 50,
    select: {
      id: true,
      displayName: true,
      connectedAt: true,
      lastSeenAt: true,
      endedAt: true,
    },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      displayName: s.displayName,
      connectedAt: s.connectedAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
    })),
  });
}
