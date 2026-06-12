import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { resolveMatchState } from "@/lib/jobs/match-run";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/jobb/match-state — fersk banner-tilstand for MatchMeBanner.
 * Trengs fordi /jobb-navigasjoner kan serveres fra App Routerens klient-
 * cache (prefetch={true} holder payloaden i opptil 5 min) — banneret
 * reconcilerer mot denne ved mount så «CV-en din er endret» dukker opp
 * uten hard refresh.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true, mainResumeId: true, matchedCvHash: true },
  });
  const resolved = userData ? resolveMatchState(userData) : null;

  return NextResponse.json(
    { state: resolved?.state ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
