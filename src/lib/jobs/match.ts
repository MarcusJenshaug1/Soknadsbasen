import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { parseActiveResume, buildResumeSummary } from "@/lib/resume-server";

import { extractJobKeywords } from "./format";
import { getKeywordIdf } from "./keyword-idf";
import {
  normalizeMatchText,
  scoreJobMatch,
  type CvMatchProfile,
  type JobMatchSide,
  type KeywordIdf,
} from "./match-scoring";

/**
 * Forhåndsberegnede match-scores per (bruker, jobb) i JobMatch-tabellen.
 *
 * Score = scoreJobMatch (match-scoring.ts, v2): vektet ferdighetsdekning
 * (jobb → CV) + yrkesaffinitet (CV → jobb) + titteltreff, ordgrense-matchet
 * og UTEN CV-globale bonuser — en irrelevant jobb scorer nær 0, en topisk
 * riktig jobb med god dekning lander 55–85.
 *
 * Terskler kalibrert for v3-scoringen 2026-06-12 (scripts/
 * calibrate-thresholds.ts mot full aktiv jobbmasse + dommer-fasit fra
 * variant-evalueringen): reell utvikler-CV ga p99=0 (F1 nuller irrelevante),
 * klare yrkestreff 35–65, beslektede 18–34, og dommer-bekreftet irrelevante
 * lakk maks til 17.
 *   Høy ≥ 35, Middels ≥ 18, Lav < 18.
 * Re-kalibrer når brukermassen vokser (n=1 CV i fasiten).
 */
export const MATCH_THRESHOLDS = { hoy: 35, middels: 18 } as const;

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
  title: string;
  jobTitle: string | null;
  category: string | null;
  occupation: string | null;
  categoryList: unknown;
  occupationList: unknown;
  aiKeywords: string[];
};

const SCORABLE_JOB_SELECT = {
  id: true,
  title: true,
  jobTitle: true,
  category: true,
  occupation: true,
  categoryList: true,
  occupationList: true,
  aiKeywords: true,
} as const;

type ResumeProfile = { cv: CvMatchProfile; cvHash: string };

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

/** Komponerer CV-fulltekst for matching — samme felter som v1, ny normalisering. */
export function buildCvMatchText(
  resume: NonNullable<ReturnType<typeof normalizeResumeData>>,
): string {
  return normalizeMatchText(
    [
      resume.role,
      resume.summary,
      resume.skills.join(" "),
      resume.experience
        .map((e) => [e.title, e.company, e.description].join(" "))
        .join(" "),
      resume.education
        .map((e) => [e.degree, e.field, e.school, e.description].join(" "))
        .join(" "),
      resume.projects.map((p) => [p.name, p.role, p.description].join(" ")).join(" "),
      resume.certifications.map((c) => [c.name, c.issuer].join(" ")).join(" "),
    ].join(" "),
  );
}

/** Parser resumeData-blob → match-profil + hash. null hvis ingen CV. */
function buildProfile(resumeData: string, cvKeywords: string[]): ResumeProfile | null {
  const resume = normalizeResumeData(resumeData);
  if (!resume) return null;
  const summary = buildResumeSummary(resume as unknown as Record<string, unknown>);
  return {
    cv: {
      text: buildCvMatchText(resume),
      role: normalizeMatchText(resume.role),
      cvKeywords,
    },
    cvHash: createHash("sha256").update(summary).digest("hex").slice(0, 32),
  };
}

export function toJobMatchSide(job: ScorableJob): JobMatchSide {
  return {
    keywords: extractJobKeywords(job),
    title: job.title,
    occupationTerms: [
      job.category ?? "",
      job.occupation ?? "",
      job.jobTitle ?? "",
      ...asNames(job.categoryList),
      ...asNames(job.occupationList),
    ].filter(Boolean),
  };
}

function asNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) =>
      typeof v === "object" && v !== null && "name" in v
        ? String((v as { name?: unknown }).name ?? "")
        : "",
    )
    .filter(Boolean);
}

function scoreRows(
  users: { userId: string; profile: ResumeProfile }[],
  jobs: ScorableJob[],
  idf: KeywordIdf,
): { userId: string; jobId: string; score: number; cvHash: string }[] {
  const rows: { userId: string; jobId: string; score: number; cvHash: string }[] = [];
  for (const job of jobs) {
    const side = toJobMatchSide(job);
    if (side.keywords.length === 0) continue;
    for (const u of users) {
      rows.push({
        userId: u.userId,
        jobId: job.id,
        score: scoreJobMatch(u.profile.cv, side, idf),
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

  const [userRows, jobs, idf] = await Promise.all([
    prisma.userData.findMany({
      where: { aiKeywordsHash: { not: null } },
      select: { userId: true, resumeData: true, aiKeywords: true },
    }),
    prisma.job.findMany({
      where: { id: { in: jobIds }, isActive: true },
      select: SCORABLE_JOB_SELECT,
    }),
    getKeywordIdf(),
  ]);

  const users = userRows
    .map((u) => ({
      userId: u.userId,
      profile: buildProfile(u.resumeData, u.aiKeywords),
    }))
    .filter((u): u is { userId: string; profile: ResumeProfile } => u.profile !== null);
  if (users.length === 0 || jobs.length === 0) return 0;

  const rows = scoreRows(users, jobs, idf);

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
    select: { resumeData: true, aiKeywords: true },
  });
  if (!userData) return 0;

  const profile = buildProfile(userData.resumeData, userData.aiKeywords);
  if (!profile) return 0;

  const [jobs, idf] = await Promise.all([
    prisma.job.findMany({
      where: { isActive: true, NOT: { aiKeywords: { isEmpty: true } } },
      select: SCORABLE_JOB_SELECT,
    }),
    getKeywordIdf(),
  ]);
  if (jobs.length === 0) return 0;

  const rows = scoreRows([{ userId, profile }], jobs, idf);

  await prisma.jobMatch.deleteMany({ where: { userId } });
  await writeRows(rows);
  return rows.length;
}
