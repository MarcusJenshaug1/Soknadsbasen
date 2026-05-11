import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkSuggestRateLimit,
  recordSuggest,
  verifyCollabAnonJwt,
} from "@/lib/collabToken";

/**
 * GET /api/collab/suggest?resourceKind=cv&resourceId=<uuid>
 * Eier-endpoint: list pending forslag for en ressurs. Krever Supabase-auth
 * via cookie + eierskap-sjekk.
 *
 * POST /api/collab/suggest
 * Body: { fieldPath, beforeValue, afterValue }
 * Header: Authorization: Bearer <anon-JWT>
 * Oppretter et forslag på vegne av en anonym sesjon. Status=pending.
 */

const MAX_PENDING_PER_RESOURCE = 100;

/* ─── GET (eier) ─────────────────────────────────────────────── */

import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const url = new URL(req.url);
  const resourceKind = url.searchParams.get("resourceKind");
  const resourceId = url.searchParams.get("resourceId");
  const statusFilter = url.searchParams.get("status") ?? "pending";

  if (
    !resourceKind ||
    (resourceKind !== "cv" && resourceKind !== "letter" && resourceKind !== "application")
  ) {
    return NextResponse.json({ error: "Ugyldig resourceKind" }, { status: 400 });
  }
  if (!resourceId) {
    return NextResponse.json({ error: "Mangler resourceId" }, { status: 400 });
  }

  // Eierskap-sjekk via invite-eierskap (alle suggestions er knyttet til en
  // invite hvor ownerId må matche).
  const ownsResource = await verifyOwnership(
    session.userId,
    resourceKind,
    resourceId,
  );
  if (!ownsResource) {
    return NextResponse.json({ error: "Ikke eier" }, { status: 403 });
  }

  const status =
    statusFilter === "pending" ||
    statusFilter === "accepted" ||
    statusFilter === "rejected"
      ? statusFilter
      : "pending";

  const suggestions = await prisma.collabSuggestion.findMany({
    where: { resourceKind, resourceId, status },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fieldPath: true,
      beforeValue: true,
      afterValue: true,
      authorName: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
    },
  });

  return NextResponse.json({
    suggestions: suggestions.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      resolvedAt: s.resolvedAt?.toISOString() ?? null,
    })),
  });
}

/* ─── POST (anonym) ──────────────────────────────────────────── */

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Mangler bearer-token" }, { status: 401 });
  }

  let claims;
  try {
    claims = await verifyCollabAnonJwt(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: "Ugyldig token" }, { status: 401 });
  }

  if (!checkSuggestRateLimit(claims.sessionId)) {
    return NextResponse.json(
      { error: "For mange forslag. Vent litt." },
      { status: 429 },
    );
  }
  recordSuggest(claims.sessionId);

  let body: {
    fieldPath?: string;
    beforeValue?: unknown;
    afterValue?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const fieldPath = body.fieldPath?.trim();
  if (!fieldPath) {
    return NextResponse.json({ error: "Mangler fieldPath" }, { status: 400 });
  }
  if (body.beforeValue === undefined || body.afterValue === undefined) {
    return NextResponse.json(
      { error: "Mangler beforeValue / afterValue" },
      { status: 400 },
    );
  }

  // Sjekk at inviten fortsatt er gyldig (klient kan ha utløpt JWT i flight).
  const invite = await prisma.collabInvite.findUnique({
    where: { id: claims.inviteId },
    select: { revokedAt: true, expiresAt: true },
  });
  if (!invite || invite.revokedAt) {
    return NextResponse.json({ error: "Lenken er trukket tilbake" }, { status: 410 });
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Lenken er utløpt" }, { status: 410 });
  }

  // Begrens antall pending per ressurs.
  const pendingCount = await prisma.collabSuggestion.count({
    where: {
      resourceKind: claims.resourceKind,
      resourceId: claims.resourceId,
      status: "pending",
    },
  });
  if (pendingCount >= MAX_PENDING_PER_RESOURCE) {
    return NextResponse.json(
      {
        error: `Maks ${MAX_PENDING_PER_RESOURCE} ventende forslag på denne ressursen. Eier må godkjenne eller avvise eksisterende først.`,
      },
      { status: 429 },
    );
  }

  // Oppdater session lastSeenAt.
  await prisma.collabSession.update({
    where: { id: claims.sessionId },
    data: { lastSeenAt: new Date() },
  }).catch(() => {
    // Hvis sesjonen er endet (eier kicket), suggestion lagres fortsatt
    // men markeres som dangling. Vi tillater det her — eier kan rydde
    // i historikk-panelet om de vil.
  });

  const suggestion = await prisma.collabSuggestion.create({
    data: {
      inviteId: claims.inviteId,
      resourceKind: claims.resourceKind,
      resourceId: claims.resourceId,
      fieldPath,
      beforeValue: body.beforeValue as never,
      afterValue: body.afterValue as never,
      authorName: claims.displayName,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({
    id: suggestion.id,
    createdAt: suggestion.createdAt.toISOString(),
  });
}

/* ─── Helpers ────────────────────────────────────────────────── */

async function verifyOwnership(
  userId: string,
  resourceKind: "cv" | "letter" | "application",
  resourceId: string,
): Promise<boolean> {
  if (resourceKind === "cv") {
    return resourceId === userId;
  }
  const app = await prisma.jobApplication.findFirst({
    where: { id: resourceId, userId },
    select: { id: true },
  });
  return !!app;
}
