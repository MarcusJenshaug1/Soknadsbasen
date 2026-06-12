import "server-only";

import { extractCvKeywords } from "@/lib/ai/cv-keyword-extract";
import { prisma } from "@/lib/prisma";
import {
  parseMainResume,
  buildResumeSummary,
  hashResumeSummary,
} from "@/lib/resume-server";

import { computeMatchesForUser } from "./match";

/**
 * Eksplisitt match-kjøring («Match meg med stillinger» på /jobb). Første
 * kjøring er gratis; re-kjøring etter CV-endring koster MATCH_REFRESH_COST
 * AI-kreditter. Tilstanden leses fra UserData.matchedCvHash mot gjeldende
 * hash av hoved-CV-en.
 */

export const MATCH_REFRESH_COST = 5;

export type MatchRunState = "never" | "stale" | "fresh";

const KEYWORD_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Ren funksjon over en allerede hentet UserData-rad — ingen ekstra rundtur.
 * null = brukeren har ingen CV (banneret skal ikke vises).
 */
export function resolveMatchState(u: {
  resumeData: string;
  mainResumeId: string | null;
  matchedCvHash: string | null;
}): { state: MatchRunState; currentHash: string } | null {
  const resume = parseMainResume(u.resumeData, u.mainResumeId);
  if (!resume) return null;
  const hasContent =
    (resume.experience?.length ?? 0) > 0 || (resume.skills?.length ?? 0) > 0;
  if (!hasContent) return null;

  const currentHash = hashResumeSummary(
    buildResumeSummary(resume as unknown as Record<string, unknown>),
  );
  const state: MatchRunState =
    u.matchedCvHash === null
      ? "never"
      : u.matchedCvHash === currentHash
        ? "fresh"
        : "stale";
  return { state, currentHash };
}

/**
 * Kjør hele matchingen for brukeren: sørg for ferske nøkkelord for
 * hoved-CV-en (Haiku ved stale cache), så ren scoring mot alle aktive
 * jobber. matchedCvHash stemples av RUTEN (claim-først-design) — ikke her.
 * Kaster ved AI-/DB-feil; kalleren refunderer og reverterer claimet.
 */
export async function runMatchForUser(userId: string): Promise<{ jobsMatched: number }> {
  const userData = await prisma.userData.findUnique({
    where: { userId },
    select: {
      resumeData: true,
      mainResumeId: true,
      aiKeywords: true,
      aiKeywordsAt: true,
      aiKeywordsHash: true,
    },
  });
  if (!userData) return { jobsMatched: 0 };

  const resume = parseMainResume(userData.resumeData, userData.mainResumeId);
  if (!resume) return { jobsMatched: 0 };

  const summary = buildResumeSummary(resume as unknown as Record<string, unknown>);
  const hash = hashResumeSummary(summary);

  const keywordsFresh =
    userData.aiKeywords.length > 0 &&
    userData.aiKeywordsHash === hash &&
    userData.aiKeywordsAt &&
    Date.now() - userData.aiKeywordsAt.getTime() < KEYWORD_TTL_MS;

  if (!keywordsFresh) {
    const keywords = await extractCvKeywords(summary);
    if (keywords.length > 0) {
      await prisma.userData.update({
        where: { userId },
        data: { aiKeywords: keywords, aiKeywordsAt: new Date(), aiKeywordsHash: hash },
      });
    }
  }

  const jobsMatched = await computeMatchesForUser(userId);
  return { jobsMatched };
}
