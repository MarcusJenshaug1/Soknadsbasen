import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/collab/suggest/[id]/resolve
 * Body: { action: "accept" | "reject" }
 * Eier-endpoint. Endrer KUN status på et CollabSuggestion.
 *
 * Den faktiske CV-endringen gjøres klient-side i SuggestionsInbox via de
 * vanlige store-actionene (useResumeStore.updateRole/updateExperience/…),
 * som propagerer videre til Y.Doc (useYjsSync) eller Supabase (useCloudSync).
 * Eier-klienten anvender endringen FØR den kaller dette endepunktet — feiler
 * applyen lokalt (slettet/flyttet felt), markeres forslaget aldri som godtatt.
 *
 * Et tidligere forsøk skrev endringen direkte til UserData.resumeData her,
 * men når Hocuspocus er aktiv er Y.Doc sannhet, så snapshotet overskrev den
 * direkte Postgres-writen. Derfor: status-only her, apply hos klienten.
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
