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
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Ugyldig body" } },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  const displayName = body.displayName?.trim();
  const clientId = body.clientId?.trim() || `anon-${Math.random().toString(36).slice(2, 10)}`;

  if (!token || token.length < 8) {
    return NextResponse.json(
      { error: { code: "missing_token", message: "Mangler token" } },
      { status: 400 },
    );
  }
  if (!displayName || displayName.length < 1 || displayName.length > 60) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_display_name",
          message: "Navn må være mellom 1 og 60 tegn",
        },
      },
      { status: 400 },
    );
  }

  if (!checkJoinRateLimit(token)) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "For mange forsøk. Vent litt og prøv igjen.",
        },
      },
      { status: 429 },
    );
  }
  recordJoin(token);

  // Tidlig env-sjekk: hvis COLLAB_JWT_SECRET ikke er satt i Vercel vil
  // signCollabAnonJwt kaste lenger ned. Fang det her med en klar 500 så
  // vi slipper en generisk Next-feil-side.
  if (!process.env.COLLAB_JWT_SECRET) {
    console.error("[/api/collab/join] COLLAB_JWT_SECRET er ikke satt i env");
    return NextResponse.json(
      {
        error: {
          code: "server_misconfigured",
          message:
            "Collab-tjenesten er ikke ferdig konfigurert. Si fra til Marcus.",
        },
      },
      { status: 500 },
    );
  }

  try {
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
        { error: { code: "invite_not_found", message: "Lenken er ikke gyldig" } },
        { status: 404 },
      );
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: { code: "invite_expired", message: "Lenken er utløpt" } },
        { status: 410 },
      );
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
  } catch (err) {
    console.error("[/api/collab/join] uventet feil:", err);
    return NextResponse.json(
      {
        error: {
          code: "internal_error",
          message:
            err instanceof Error
              ? `Intern feil: ${err.name}`
              : "Intern feil ved tilkobling",
        },
      },
      { status: 500 },
    );
  }
}
