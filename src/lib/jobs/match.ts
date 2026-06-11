import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  buildNormalizedResume,
  scoreAtsFromNormalized,
  type NormalizedResume,
} from "@/lib/ats";
import { parseActiveResume, buildResumeSummary } from "@/lib/resume-server";

import { extractJobKeywords } from "./format";

/**
 * Forhåndsberegnede match-scores per (bruker, jobb) i JobMatch-tabellen.
 *
 * Score = scoreAtsFromNormalized (src/lib/ats.ts):
 *   min(1, keyword-dekning × 0.68 + summary-bonus 0.08 + kompletthet ≤ 0.12) × 100.
 * Realistisk tak er ~88 (full dekning + alle bonuser). En CV som dekker
 * halvparten av nøkkelordene med komplett profil lander rundt 50.
 *
 * Terskler (samme bånd som dagens UI brukte for 60/40-grensene):
 *   Høy ≥ 60 — godt over halvparten av kravene dekket.
 *   Middels 40–59 — delvis dekning, verdt å vurdere.
 *   Lav < 40 — svak dekning.
 * Valideres mot faktisk persentilfordeling etter backfill (se Fase 0.5-plan)
 * før Fase 2 hardkoder labels i UI.
 */
export const MATCH_THRESHOLDS = { hoy: 60, middels: 40 } as const;

export type MatchTier = "hoy" | "middels" | "lav";

export function matchTier(score: number): MatchTier {
  if (score >= MATCH_THRESHOLDS.hoy) return "hoy";
  if (score >= MATCH_THRESHOLDS.middels) return "middels";
  return "lav";
}

// Chunk-størrelse for createMany — holder hver statement godt under 1 MB
// og unngår lange transaksjoner gjennom pgBouncer.
const CREATE_CHUNK = 2000;

type ScorableJob = {
  id: string;
  category: string | null;
  occupation: string | null;
  categoryList: unknown;
  occupationList: unknown;
  aiKeywords: string[];
};

const SCORABLE_JOB_SELECT = {
  id: true,
  category: true,
  occupation: true,
  categoryList: true,
  occupationList: true,
  aiKeywords: true,
} as const;

type ResumeProfile = { normalized: NormalizedResume; cvHash: string };

/** Parser resumeData-blob → normalisert tekst + hash. null hvis ingen CV. */
function buildProfile(resumeData: string): ResumeProfile | null {
  const resume = parseActiveResume(resumeData);
  if (!resume) return null;
  const summary = buildResumeSummary(resume as unknown as Record<string, unknown>);
  return {
    normalized: buildNormalizedResume(resume),
    cvHash: createHash("sha256").update(summary).digest("hex").slice(0, 32),
  };
}

function scoreRows(
  users: { userId: string; profile: ResumeProfile }[],
  jobs: ScorableJob[],
): { userId: string; jobId: string; score: number; cvHash: string }[] {
  const rows: { userId: string; jobId: string; score: number; cvHash: string }[] = [];
  for (const job of jobs) {
    const keywords = extractJobKeywords(job);
    if (keywords.length === 0) continue;
    for (const u of users) {
      rows.push({
        userId: u.userId,
        jobId: job.id,
        score: scoreAtsFromNormalized(u.profile.normalized, keywords),
        cvHash: u.profile.cvHash,
      });
    }
  }
  return rows;
}

async function writeRows(
  rows: { userId: string; jobId: string; score: number; cvHash: string }[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += CREATE_CHUNK) {
    await prisma.jobMatch.createMany({
      data: rows.slice(i, i + CREATE_CHUNK),
      skipDuplicates: true,
    });
  }
}

/**
 * Scorer et batch nyberikede jobber mot alle brukere som har engasjert seg
 * med match-funksjonene (aiKeywordsHash satt = CV-keywords beregnet minst én
 * gang). Kjøres fra enrich-cronen. Returnerer antall skrevne rader.
 */
export async function computeMatchesForJobs(jobIds: string[]): Promise<number> {
  if (jobIds.length === 0) return 0;

  const [userRows, jobs] = await Promise.all([
    prisma.userData.findMany({
      where: { aiKeywordsHash: { not: null } },
      select: { userId: true, resumeData: true },
    }),
    prisma.job.findMany({
      where: { id: { in: jobIds }, isActive: true },
      select: SCORABLE_JOB_SELECT,
    }),
  ]);

  const users = userRows
    .map((u) => ({ userId: u.userId, profile: buildProfile(u.resumeData) }))
    .filter((u): u is { userId: string; profile: ResumeProfile } => u.profile !== null);
  if (users.length === 0 || jobs.length === 0) return 0;

  const rows = scoreRows(users, jobs);

  // Delete + createMany er idempotente enkeltsteg (ingen lang transaksjon
  // gjennom pgBouncer); krasj midt i selvhelbreder ved neste kjøring.
  await prisma.jobMatch.deleteMany({ where: { jobId: { in: jobIds } } });
  await writeRows(rows);
  return rows.length;
}

/**
 * Re-scorer én bruker mot alle aktive, berikede jobber. Hektes på
 * cv-keywords-refresh via after() — fyrer maks ~1×/dag/bruker pga.
 * eksisterende TTL+hash-invalidering der.
 */
export async function computeMatchesForUser(userId: string): Promise<number> {
  const userData = await prisma.userData.findUnique({
    where: { userId },
    select: { resumeData: true },
  });
  if (!userData) return 0;

  const profile = buildProfile(userData.resumeData);
  if (!profile) return 0;

  const jobs = await prisma.job.findMany({
    where: { isActive: true, NOT: { aiKeywords: { isEmpty: true } } },
    select: SCORABLE_JOB_SELECT,
  });
  if (jobs.length === 0) return 0;

  const rows = scoreRows([{ userId, profile }], jobs);

  await prisma.jobMatch.deleteMany({ where: { userId } });
  await writeRows(rows);
  return rows.length;
}
