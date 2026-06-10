import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateShareToken,
  ttlToExpiresAt,
  type CollabResourceKind,
} from "@/lib/collabToken";

/**
 * GET /api/collab/invite
 * List eier sine aktive invitasjoner. Filter via ?kind=cv|letter|application
 * og ?resourceId=<uuid>.
 *
 * POST /api/collab/invite
 * Body: { resourceKind, resourceId, ttlHours?, label? }
 * Validerer eierskap (cv: må være session.userId; letter/application:
 * JobApplication.userId må matche). Oppretter token + rad.
 */

const MAX_ACTIVE_INVITES_PER_USER = 20;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as CollabResourceKind | null;
  const resourceId = url.searchParams.get("resourceId");
  // includeArchived=1: ta også med tilbakekalte lenker (for InviteModal sin
  // arkiv-seksjon). Uten param (f.eks. varsel-bjella) returneres kun aktive.
  const includeArchived = url.searchParams.get("includeArchived") === "1";

  const invites = await prisma.collabInvite.findMany({
    where: {
      ownerId: session.userId,
      ...(includeArchived ? {} : { revokedAt: null }),
      ...(kind ? { resourceKind: kind } : {}),
      ...(resourceId ? { resourceId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      resourceKind: true,
      resourceId: true,
      label: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      _count: {
        select: {
          sessions: { where: { endedAt: null } },
          suggestions: { where: { status: "pending" } },
        },
      },
    },
  });

  return NextResponse.json({
    invites: invites.map((i) => ({
      id: i.id,
      token: i.token,
      resourceKind: i.resourceKind,
      resourceId: i.resourceId,
      label: i.label,
      expiresAt: i.expiresAt?.toISOString() ?? null,
      revokedAt: i.revokedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      activeSessions: i._count.sessions,
      pendingSuggestions: i._count.suggestions,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  let body: {
    resourceKind?: CollabResourceKind;
    resourceId?: string;
    ttlHours?: number | null;
    label?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const { resourceKind, resourceId } = body;
  if (
    !resourceKind ||
    (resourceKind !== "cv" && resourceKind !== "letter" && resourceKind !== "application")
  ) {
    return NextResponse.json(
      { error: "Mangler eller ugyldig resourceKind" },
      { status: 400 },
    );
  }
  if (typeof resourceId !== "string" || resourceId.length < 8) {
    return NextResponse.json({ error: "Mangler resourceId" }, { status: 400 });
  }

  // Eierskap-sjekk per ressurstype.
  if (resourceKind === "cv") {
    // For nå har vi én CV per bruker, og resourceId === session.userId.
    if (resourceId !== session.userId) {
      return NextResponse.json({ error: "Ikke eier av denne CV-en" }, { status: 403 });
    }
  } else {
    // letter eller application: må eie JobApplication.
    const app = await prisma.jobApplication.findFirst({
      where: { id: resourceId, userId: session.userId },
      select: { id: true },
    });
    if (!app) {
      return NextResponse.json({ error: "Ikke eier av denne søknaden" }, { status: 403 });
    }
  }

  // Begrens antall aktive invites per bruker.
  const activeCount = await prisma.collabInvite.count({
    where: { ownerId: session.userId, revokedAt: null },
  });
  if (activeCount >= MAX_ACTIVE_INVITES_PER_USER) {
    return NextResponse.json(
      {
        error: `Maks ${MAX_ACTIVE_INVITES_PER_USER} aktive invitasjoner. Revoker en før du oppretter ny.`,
      },
      { status: 429 },
    );
  }

  const ttlHours = body.ttlHours ?? 7 * 24; // default: 7 dager
  const expiresAt = ttlToExpiresAt(ttlHours);

  const label = body.label?.trim() || null;

  // Generer unik token (retry hvis kollisjon — ekstremt usannsynlig med 96-bit).
  let token = generateShareToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await prisma.collabInvite.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!existing) break;
    token = generateShareToken();
  }

  const invite = await prisma.collabInvite.create({
    data: {
      token,
      ownerId: session.userId,
      resourceKind,
      resourceId,
      label,
      expiresAt,
    },
    select: { id: true, token: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    url: `/collab/${resourceKind}/${invite.token}`,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
  });
}
