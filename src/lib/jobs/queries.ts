import "server-only";

import { cache } from "react";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { jobWhereSql, type JobbFilter } from "./filters";
import { getRegisterIndex, type RegisterIndex } from "./registers";
import {
  parseJobbSearchParams,
  type JobbParams,
  type SortKey,
} from "./search-params";

export const PAGE_SIZE = 20;

/**
 * Deler parse + register-oppslag mellom page og generateMetadata i SAMME
 * request. React.cache() sammenligner argumenter med ===, så nøkkelen må
 * være en stabil streng — serializeRawParams gir deterministisk rekkefølge.
 */
export function serializeRawParams(
  raw: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const key of Object.keys(raw).sort()) {
    const v = raw[key];
    if (v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) qs.append(key, item);
  }
  return qs.toString();
}

export type JobbContext = {
  index: RegisterIndex;
  params: JobbParams;
  filter: JobbFilter;
  redirectTo: string | null;
};

export const getJobbContext = cache(async (rawQs: string): Promise<JobbContext> => {
  const qs = new URLSearchParams(rawQs);
  const raw: Record<string, string[]> = {};
  for (const key of qs.keys()) raw[key] = qs.getAll(key);
  const index = await getRegisterIndex();
  const parsed = parseJobbSearchParams(raw, index);
  return { index, ...parsed };
});

export type JobListItem = {
  id: string;
  slug: string;
  title: string;
  employerName: string;
  employerHomepage: string | null;
  kommune: string | null;
  region: string | null;
  extent: string | null;
  engagementType: string | null;
  aiRemote: string | null;
  isSummerJob: boolean;
  applicationDueAt: Date | null;
  publishedAt: Date;
  excerpt: string;
  /** null for anonyme og uberegnede par. */
  matchScore: number | null;
  /** Kun innloggede — anonym sett-status ligger i localStorage (klient). */
  seen: boolean;
};

/**
 * Trefflisten. Raw SQL: searchVector er Unsupported i Prisma, og match-/
 * relevans-sortering trenger JOIN/ts_rank. Deler WHERE-fragment med
 * facett-RPC-en (filters.ts) så liste og counts aldri spriker.
 */
export async function getJobList(opts: {
  filter: JobbFilter;
  sort: SortKey;
  side: number;
  userId: string | null;
}): Promise<JobListItem[]> {
  const { filter, side, userId } = opts;
  // match/relevans degraderer til nyeste når forutsetningen mangler.
  const sort =
    (opts.sort === "match" && !userId) || (opts.sort === "relevans" && !filter.q?.trim())
      ? "nyeste"
      : opts.sort;

  const userJoins = userId
    ? Prisma.sql`
        LEFT JOIN "JobMatch" m ON m."jobId" = j.id AND m."userId" = ${userId}::uuid
        LEFT JOIN "JobSeen" s ON s."jobId" = j.id AND s."userId" = ${userId}::uuid`
    : Prisma.empty;

  const orderBy =
    sort === "match"
      ? Prisma.sql`m.score DESC NULLS LAST, j."publishedAt" DESC`
      : sort === "frist"
        ? Prisma.sql`j."applicationDueAt" ASC NULLS LAST, j."publishedAt" DESC`
        : sort === "relevans"
          ? Prisma.sql`ts_rank_cd(j."searchVector", websearch_to_tsquery('norwegian', ${filter.q!.trim()})) DESC, j."publishedAt" DESC`
          : Prisma.sql`j."publishedAt" DESC`;

  const rows = await prisma.$queryRaw<
    (Omit<JobListItem, "matchScore" | "seen"> & {
      matchScore: number | null;
      seen: boolean | null;
    })[]
  >`
    SELECT
      j.id, j.slug, j.title,
      j."employerName", j."employerHomepage",
      j.kommune, j.region, j.extent, j."engagementType",
      j."aiRemote", j."isSummerJob",
      j."applicationDueAt", j."publishedAt",
      left(regexp_replace(regexp_replace(j.description, '<[^>]+>', ' ', 'g'), '\\s+', ' ', 'g'), 240) AS excerpt,
      ${userId ? Prisma.sql`m.score` : Prisma.sql`NULL::smallint`} AS "matchScore",
      ${userId ? Prisma.sql`(s."userId" IS NOT NULL)` : Prisma.sql`false`} AS seen
    FROM "Job" j
    ${userJoins}
    WHERE ${jobWhereSql(filter)}
    ORDER BY ${orderBy}
    LIMIT ${PAGE_SIZE} OFFSET ${(side - 1) * PAGE_SIZE}
  `;

  return rows.map((r) => ({
    ...r,
    excerpt: r.excerpt?.trim() ?? "",
    matchScore: r.matchScore === null ? null : Number(r.matchScore),
    seen: Boolean(r.seen),
  }));
}

/** Toppmatcher til «Anbefalt for deg»-raden (innloggede med CV). */
export const getTopMatches = cache(
  async (userId: string, limit: number): Promise<JobListItem[]> => {
    const rows = await prisma.$queryRaw<
      (Omit<JobListItem, "seen"> & { seen: boolean | null })[]
    >`
      SELECT
        j.id, j.slug, j.title,
        j."employerName", j."employerHomepage",
        j.kommune, j.region, j.extent, j."engagementType",
        j."aiRemote", j."isSummerJob",
        j."applicationDueAt", j."publishedAt",
        '' AS excerpt,
        m.score AS "matchScore",
        (s."userId" IS NOT NULL) AS seen
      FROM "JobMatch" m
      JOIN "Job" j ON j.id = m."jobId" AND j."isActive"
      LEFT JOIN "JobSeen" s ON s."jobId" = j.id AND s."userId" = m."userId"
      WHERE m."userId" = ${userId}::uuid
      ORDER BY m.score DESC, j."publishedAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      ...r,
      matchScore: r.matchScore === null ? null : Number(r.matchScore),
      seen: Boolean(r.seen),
    }));
  },
);

/** Gjennomsnittlig toppmatch — driver «Forbedre CV-en»-hintet (Fase 2). */
export const getAvgTopMatch = cache(async (userId: string): Promise<number | null> => {
  const rows = await prisma.$queryRaw<{ avg: number | null }[]>`
    SELECT avg(score)::float AS avg FROM (
      SELECT m.score FROM "JobMatch" m
      JOIN "Job" j ON j.id = m."jobId" AND j."isActive"
      WHERE m."userId" = ${userId}::uuid
      ORDER BY m.score DESC LIMIT 20
    ) top
  `;
  return rows[0]?.avg ?? null;
});
