import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { extractCvKeywords } from "@/lib/ai/cv-keyword-extract";
import { prisma } from "@/lib/prisma";
import {
  parseMainResume,
  buildResumeSummary,
  hashResumeSummary,
} from "@/lib/resume-server";

/**
 * POST /api/ai/cv-keywords
 * Returns: { keywords: string[], cached: boolean, source: "ai" | "fallback" }
 *
 * Henter (eller computer + cacher) ATS-relevante nøkkelord fra brukerens
 * HOVED-CV (samme CV som matching bruker — ATS-visning og matching deler
 * aiKeywords-cachen og må aldri invalidere hverandre). Cache invalideres
 * når hoved-CV-en endres (hash) eller etter 24t.
 *
 * MERK: trigger IKKE lenger re-matching — det skjer kun eksplisitt via
 * POST /api/jobb/match-me (Match meg-knappen på /jobb).
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  if (!checkAiRateLimit(session.userId)) return NextResponse.json({ error: AI_RATE_LIMIT_MESSAGE }, { status: 429 });

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: {
      resumeData: true,
      mainResumeId: true,
      aiKeywords: true,
      aiKeywordsAt: true,
      aiKeywordsHash: true,
    },
  });
  if (!userData) {
    return NextResponse.json({ keywords: [], cached: false, source: "fallback" });
  }

  const resume = parseMainResume(userData.resumeData, userData.mainResumeId);
  if (!resume) {
    return NextResponse.json({ keywords: [], cached: false, source: "fallback" });
  }

  const summary = buildResumeSummary(resume as unknown as Record<string, unknown>);
  const hash = hashResumeSummary(summary);

  const stillFresh =
    userData.aiKeywords.length > 0 &&
    userData.aiKeywordsHash === hash &&
    userData.aiKeywordsAt &&
    Date.now() - userData.aiKeywordsAt.getTime() < CACHE_TTL_MS;

  if (stillFresh) {
    return NextResponse.json({
      keywords: userData.aiKeywords,
      cached: true,
      source: "ai",
    });
  }

  try {
    const keywords = await extractCvKeywords(summary);

    if (keywords.length > 0) {
      await prisma.userData.update({
        where: { userId: session.userId },
        data: {
          aiKeywords: keywords,
          aiKeywordsAt: new Date(),
          aiKeywordsHash: hash,
        },
      });
    }

    return NextResponse.json({ keywords, cached: false, source: "ai" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
