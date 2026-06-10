import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applySuggestionToResume } from "@/lib/collab/applySuggestion";

/**
 * POST /api/collab/suggest/[id]/resolve
 * Body: { action: "accept" | "reject" }
 * Eier-endpoint. Endrer status på et CollabSuggestion.
 *
 * Når status="accepted": dette endepunktet markerer KUN suggestion-en.
 * Den faktiske endringen til Y.Doc / Postgres-raden gjøres av eier-
 * klienten lokalt (siden eier allerede har Y.Doc + Hocuspocus-tilkobling
 * via useYjsSync). Klienten kaller dette EFTER å ha applyet endringen,
 * slik at vi får atomicitet: feiler den server-side oppdateringen,
 * gjøres heller ingen klient-side write.
 *
 * Hvis vi i fremtiden vil ha full server-driven apply (uavhengig av om
 * eier-klienten er på), må vi instansiere Y.Doc server-side og pushe
 * mutasjonen via Hocuspocus directConnection. Det er Fase 4-polish.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: "accept" | "reject" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json(
      { error: "action må være 'accept' eller 'reject'" },
      { status: 400 },
    );
  }

  // Eierskap-sjekk via invite-ownerId.
  const suggestion = await prisma.collabSuggestion.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      fieldPath: true,
      afterValue: true,
      resourceKind: true,
      invite: { select: { ownerId: true } },
    },
  });
  if (!suggestion || suggestion.invite.ownerId !== session.userId) {
    return NextResponse.json({ error: "Finner ikke forslaget" }, { status: 404 });
  }
  if (suggestion.status !== "pending") {
    return NextResponse.json(
      { error: "Forslaget er allerede behandlet" },
      { status: 409 },
    );
  }

  // Server-drevet apply: for CV anvendes den godkjente endringen direkte i
  // eierens lagrede CV, så forslaget får effekt uavhengig av om eier har
  // editoren åpen. (Tidligere markerte ruten kun status, og endringen ble
  // aldri synlig for eier.)
  if (action === "accept" && suggestion.resourceKind === "cv") {
    const userData = await prisma.userData.findUnique({
      where: { userId: session.userId },
      select: { resumeData: true },
    });
    if (userData) {
      const next = applySuggestionToResume(
        userData.resumeData,
        suggestion.fieldPath,
        suggestion.afterValue,
      );
      if (next) {
        await prisma.userData.update({
          where: { userId: session.userId },
          data: { resumeData: next },
        });
      }
    }
  }

  const updated = await prisma.collabSuggestion.update({
    where: { id },
    data: {
      status: action === "accept" ? "accepted" : "rejected",
      resolvedAt: new Date(),
      resolvedById: session.userId,
    },
    select: {
      id: true,
      status: true,
      resolvedAt: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    resolvedAt: updated.resolvedAt?.toISOString() ?? null,
  });
}
