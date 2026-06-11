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
 * Teoretisk tak ~88, men empirisk topper en reell, komplett CV rundt 45-50:
 * jobbenes keyword-sett er 15-30 termer og substring-dekning over 60 % av dem
 * forekommer ikke i praksis.
 *
 * Terskler KALIBRERT MOT FAKTISK PROD-FORDELING etter backfill 2026-06-11
 * (9 822 aktive jobber; reell CV: max=47, p99=36, 38 jobber >= 40):
 *   Høy ≥ 40 — topp ~0,5 % av stillingene for en god CV; sjelden og reell.
 *   Middels 25-39 — omtrent topp 1-5 %; verdt å vurdere.
 *   Lav < 25 — svak dekning.
 * Re-kalibrer når brukermassen vokser (persentil-query i
 * scripts/harvest-job-facets.ts) — n=1 reell CV er tynt grunnlag.
 */
export const MATCH_THRESHOLDS = { hoy: 40, middels: 25 } as const;

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

/**
 * Normalisert CV med defensive defaults — gjenbrukes av match-breakdown på
 * detaljsiden (samme form som precompute scorer mot).
 */
export function normalizeResumeData(resumeData: string) {
  const parsed = parseActiveResume(resumeData);
  if (!parsed) return null;
  return {
    ...parsed,
    role: parsed.role ?? "",
    summary: parsed.summary ?? "",
    templateId: parsed.templateId ?? "",
    skills: parsed.skills ?? [],
    experience: parsed.experience ?? [],
    education: parsed.education ?? [],
    projects: parsed.projects ?? [],
    certifications: parsed.certifications ?? [],
  };
}

/** Parser resumeData-blob → normalisert tekst + hash. null hvis ingen CV. */
function buildProfile(resumeData: string): ResumeProfile | null {
  // parseActiveResume normaliserer IKKE formen — eldre/delvise blobs kan
  // mangle arrays (skills, experience, …), og buildNormalizedResume antar
  // full ResumeData. Defensive defaults i normalizeResumeData.
  const resume = normalizeResumeData(resumeData);
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
