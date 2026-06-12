import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { normalizeResumeData } from "./match";
import { resolveMatchState, type MatchRunState } from "./match-run";
import { getAvgTopMatch } from "./queries";

export type CvStatus = {
  hasCv: boolean;
  /** 0–100, fem felt: rolle, sammendrag, erfaring, ferdigheter, utdanning. */
  completeness: number;
  /** Snitt av topp-20-matchene — driver «Forbedre CV-en»-hintet. */
  avgTopMatch: number | null;
  /** Driver Match meg-banneret: never = gratis run, stale = betalt, fresh = skjult. */
  matchState: MatchRunState | null;
};

export const getCvStatus = cache(async (userId: string): Promise<CvStatus> => {
  const [userData, avgTopMatch] = await Promise.all([
    prisma.userData.findUnique({
      where: { userId },
      select: { resumeData: true, mainResumeId: true, matchedCvHash: true },
    }),
    getAvgTopMatch(userId),
  ]);
  const resume = userData
    ? normalizeResumeData(userData.resumeData, userData.mainResumeId)
    : null;
  if (!resume) {
    return { hasCv: false, completeness: 0, avgTopMatch: null, matchState: null };
  }

  const fields = [
    Boolean(resume.role.trim()),
    resume.summary.trim().length > 60,
    resume.experience.length > 0,
    resume.skills.length > 0,
    resume.education.length > 0,
  ];
  const completeness = Math.round(
    (fields.filter(Boolean).length / fields.length) * 100,
  );
  const hasContent = resume.experience.length > 0 || resume.skills.length > 0;
  const matchState = userData ? (resolveMatchState(userData)?.state ?? null) : null;
  return { hasCv: hasContent, completeness, avgTopMatch, matchState };
});
