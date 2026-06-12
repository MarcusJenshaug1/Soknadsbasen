import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { consumeAiCredit, refundAiCredit, type ConsumeResult } from "@/lib/ai/credits";
import { quotaErrorResponse } from "@/lib/ai/quota-response";
import {
  MATCH_REFRESH_COST,
  resolveMatchState,
  runMatchForUser,
} from "@/lib/jobs/match-run";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/jobb/match-me — eksplisitt match-kjøring fra /jobb.
 *
 * Første kjøring (matchedCvHash null) er GRATIS; re-kjøring etter
 * CV-endring koster MATCH_REFRESH_COST AI-kreditter. matchedCvHash
 * stemples atomisk FØR betaling og arbeid (claim-først): to samtidige
 * kall leser samme hash, kun ett updateMany treffer — dobbeltklikk kan
 * aldri gi to gratisrunder eller dobbel belastning. Ved feil etter claim
 * reverteres stempelet og kreditter refunderes.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  if (!checkAiRateLimit(session.userId)) {
    return NextResponse.json({ error: AI_RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  const userId = session.userId;

  const userData = await prisma.userData.findUnique({
    where: { userId },
    select: {
      resumeData: true,
      mainResumeId: true,
      matchedCvHash: true,
      matchedAt: true,
    },
  });
  if (!userData) {
    return NextResponse.json(
      { error: "Fyll inn CV-en din først.", code: "no_cv" },
      { status: 400 },
    );
  }

  const resolved = resolveMatchState(userData);
  if (!resolved) {
    return NextResponse.json(
      { error: "Fyll inn CV-en din først.", code: "no_cv" },
      { status: 400 },
    );
  }
  if (resolved.state === "fresh") {
    return NextResponse.json({ ok: true, upToDate: true });
  }

  // Atomisk claim betinget på verdien vi leste (null på gratis-stien) —
  // taperen i et race treffer 0 rader og får 409.
  const claim = await prisma.userData.updateMany({
    where: { userId, matchedCvHash: userData.matchedCvHash },
    data: { matchedCvHash: resolved.currentHash, matchedAt: new Date() },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      { error: "Matching pågår allerede.", code: "in_progress" },
      { status: 409 },
    );
  }

  const revertClaim = async () => {
    try {
      await prisma.userData.updateMany({
        where: { userId, matchedCvHash: resolved.currentHash },
        data: {
          matchedCvHash: userData.matchedCvHash,
          matchedAt: userData.matchedAt,
        },
      });
    } catch (err) {
      console.error("match-me: revertClaim feilet:", err);
    }
  };

  // Betalt sti: trekk kreditter ETTER claimet (kun én betaler i et race).
  let consumed: ConsumeResult | null = null;
  if (resolved.state === "stale") {
    consumed = await consumeAiCredit(userId, "match_refresh", MATCH_REFRESH_COST);
    if (!consumed.ok) {
      await revertClaim();
      return quotaErrorResponse(consumed);
    }
  }

  try {
    const { jobsMatched } = await runMatchForUser(userId);
    return NextResponse.json({
      ok: true,
      jobsMatched,
      free: resolved.state === "never",
      remaining: consumed?.ok ? consumed.remaining : null,
    });
  } catch (err) {
    console.error("match-me: runMatchForUser feilet:", err);
    if (consumed?.ok) {
      await refundAiCredit(userId, consumed.source, consumed.periodStart, MATCH_REFRESH_COST);
    }
    await revertClaim();
    return NextResponse.json(
      { error: "Matchingen feilet. Prøv igjen om litt." },
      { status: 502 },
    );
  }
}
