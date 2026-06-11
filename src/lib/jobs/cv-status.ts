import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { normalizeResumeData } from "./match";
import { getAvgTopMatch } from "./queries";

export type CvStatus = {
  hasCv: boolean;
  /** 0–100, fem felt: rolle, sammendrag, erfaring, ferdigheter, utdanning. */
  completeness: number;
  /** Snitt av topp-20-matchene — driver «Forbedre CV-en»-hintet. */
  avgTopMatch: number | null;
};

export const getCvStatus = cache(async (userId: string): Promise<CvStatus> => {
  const [userData, avgTopMatch] = await Promise.all([
    prisma.userData.findUnique({
      where: { userId },
      select: { resumeData: true },
    }),
    getAvgTopMatch(userId),
  ]);
  const resume = userData ? normalizeResumeData(userData.resumeData) : null;
  if (!resume) return { hasCv: false, completeness: 0, avgTopMatch: null };

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
  return { hasCv: hasContent, completeness, avgTopMatch };
});
