import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkJoinRateLimit,
  recordJoin,
  signCollabAnonJwt,
} from "@/lib/collabToken";

/**
 * POST /api/collab/join
 * Body: { token, displayName, clientId? }
 * Validerer at token finnes, ikke er revoked og ikke er utløpt.
 * Oppretter en CollabSession-rad og returnerer en anon-JWT som
 * klient bruker mot Hocuspocus.
 *
 * Public endpoint — ingen Supabase-auth-sjekk. Token er bevis nok.
 */
export async function POST(req: Request) {
  let body: { token?: string; displayName?: string; clientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const token = body.token?.trim();
  const displayName = body.displayName?.trim();
  const clientId = body.clientId?.trim() || `anon-${Math.random().toString(36).slice(2, 10)}`;

  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Mangler token" }, { status: 400 });
  }
  if (!displayName || displayName.length < 1 || displayName.length > 60) {
    return NextResponse.json(
      { error: "Navn må være mellom 1 og 60 tegn" },
      { status: 400 },
    );
  }

  if (!checkJoinRateLimit(token)) {
    return NextResponse.json(
      { error: "For mange forsøk. Vent litt og prøv igjen." },
      { status: 429 },
    );
  }
  recordJoin(token);

  const invite = await prisma.collabInvite.findUnique({
    where: { token },
    select: {
      id: true,
      ownerId: true,
      resourceKind: true,
      resourceId: true,
      label: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!invite || invite.revokedAt) {
    return NextResponse.json(
      { error: "Lenken er ikke gyldig" },
      { status: 404 },
    );
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Lenken er utløpt" }, { status: 410 });
  }

  // Opprett sesjon. Hvis samme clientId allerede har en aktiv sesjon
  // på denne inviten, gjenbruk den i stedet for å lage duplikater
  // (skjer ved page-refresh / reconnect på samme fane).
  const existing = await prisma.collabSession.findFirst({
    where: { inviteId: invite.id, clientId, endedAt: null },
    select: { id: true },
  });
  let sessionRow = existing;
  if (!sessionRow) {
    sessionRow = await prisma.collabSession.create({
      data: {
        inviteId: invite.id,
        clientId,
        displayName,
      },
      select: { id: true },
    });
  } else {
    // Oppdater displayName + lastSeenAt så eier ser navn-endringer.
    await prisma.collabSession.update({
      where: { id: sessionRow.id },
      data: { displayName, lastSeenAt: new Date() },
    });
  }

  const jwt = await signCollabAnonJwt({
    inviteId: invite.id,
    sessionId: sessionRow.id,
    resourceKind: invite.resourceKind,
    resourceId: invite.resourceId,
    displayName,
  });

  return NextResponse.json({
    jwt,
    sessionId: sessionRow.id,
    inviteId: invite.id,
    resourceKind: invite.resourceKind,
    resourceId: invite.resourceId,
    ownerLabel: invite.label,
  });
}
