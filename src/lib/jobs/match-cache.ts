import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  parseMainResume,
  buildResumeSummary,
  hashResumeSummary,
} from "@/lib/resume-server";

/**
 * Pre-fetcher cached AI-keywords for /jobb/[slug] sin JobAtsCard. Bruker
 * samme DB-cache som /api/ai/cv-keywords + /api/ai/job-keywords slik at
 * server-render kan vise score umiddelbart uten 2 klient-roundtrips.
 *
 * Returnerer null hvis cache stale/miss — klienten faller da tilbake til
 * fetch-på-mount slik den gjorde før.
 */

const CV_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type CachedMatch = {
  cvKeywords: string[];
  jobKeywords: string[];
  source: "ai";
};

export const getCachedMatch = cache(
  async (userId: string, slug: string): Promise<CachedMatch | null> => {
    const [userData, job] = await Promise.all([
      prisma.userData.findUnique({
        where: { userId },
        select: {
          resumeData: true,
          mainResumeId: true,
          aiKeywords: true,
          aiKeywordsAt: true,
          aiKeywordsHash: true,
        },
      }),
      prisma.job.findUnique({
        where: { slug },
        select: { aiKeywords: true },
      }),
    ]);

    if (!userData || !job) return null;
    if (userData.aiKeywords.length === 0) return null;
    if (job.aiKeywords.length === 0) return null;

    const resume = parseMainResume(userData.resumeData, userData.mainResumeId);
    if (!resume) return null;

    const summary = buildResumeSummary(resume as unknown as Record<string, unknown>);
    const hash = hashResumeSummary(summary);

    const stillFresh =
      userData.aiKeywordsHash === hash &&
      userData.aiKeywordsAt &&
      Date.now() - userData.aiKeywordsAt.getTime() < CV_CACHE_TTL_MS;

    if (!stillFresh) return null;

    return {
      cvKeywords: userData.aiKeywords,
      jobKeywords: job.aiKeywords,
      source: "ai",
    };
  },
);

