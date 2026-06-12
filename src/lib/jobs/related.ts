import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type RelatedJob = {
  slug: string;
  title: string;
  employerName: string;
  employerHomepage: string | null;
  location: string | null;
};

type Candidate = {
  slug: string;
  title: string;
  employerName: string;
  employerHomepage: string | null;
  location: string | null;
  category: string | null;
  occupation: string | null;
  occupationList: unknown;
  aiKeywords: string[];
  employerSlug: string;
  region: string | null;
  publishedAt: Date;
};

const CANDIDATE_SELECT = {
  slug: true,
  title: true,
  employerName: true,
  employerHomepage: true,
  location: true,
  category: true,
  occupation: true,
  occupationList: true,
  aiKeywords: true,
  employerSlug: true,
  region: true,
  publishedAt: true,
} as const;

function occupationNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) =>
      typeof v === "object" && v !== null && "name" in v
        ? String((v as { name?: unknown }).name ?? "").toLowerCase()
        : "",
    )
    .filter(Boolean);
}

/**
 * Lignende stillinger: yrke (occupation/occupationList fra NAV) er
 * hovedsignalet, så kategori og arbeidsgiver. Region kvalifiserer ALDRI
 * alene — den ga servitør-treff på utviklerstillinger — og brukes kun som
 * tiebreak blant allerede kvalifiserte kandidater. Heller færre treff enn
 * absurde. cache() deler rundturen mellom hurtigvisning og full side.
 */
export const getRelatedJobs = cache(
  async (
    job: {
      slug: string;
      category: string | null;
      occupation: string | null;
      occupationList: unknown;
      aiKeywords: string[];
      employerSlug: string;
      region: string | null;
    },
    limit: number,
  ): Promise<RelatedJob[]> => {
    const orFilters: Array<Record<string, string>> = [];
    if (job.occupation) orFilters.push({ occupation: job.occupation });
    if (job.category) orFilters.push({ category: job.category });

    let candidates: Candidate[] = orFilters.length
      ? await prisma.job.findMany({
          where: { isActive: true, slug: { not: job.slug }, OR: orFilters },
          select: CANDIDATE_SELECT,
          orderBy: { publishedAt: "desc" },
          take: 24,
        })
      : [];

    // Fyll opp med samme arbeidsgiver kun når yrke/kategori ikke ga nok —
    // ellers flommer store arbeidsgivere vinduet med urelaterte roller.
    if (candidates.length < limit && job.employerSlug) {
      const fill = await prisma.job.findMany({
        where: {
          isActive: true,
          slug: { not: job.slug, notIn: candidates.map((c) => c.slug) },
          employerSlug: job.employerSlug,
        },
        select: CANDIDATE_SELECT,
        orderBy: { publishedAt: "desc" },
        take: limit,
      });
      candidates = [...candidates, ...fill];
    }

    const ownNames = new Set(occupationNames(job.occupationList));
    const ownKeywords = new Set(job.aiKeywords.map((k) => k.toLowerCase()));

    return candidates
      .map((r) => {
        const nameOverlap = occupationNames(r.occupationList).some((n) =>
          ownNames.has(n),
        );
        const keywordHits = ownKeywords.size
          ? Math.min(
              2,
              r.aiKeywords.filter((k) => ownKeywords.has(k.toLowerCase())).length,
            )
          : 0;
        return {
          ...r,
          rank:
            (job.occupation && r.occupation === job.occupation ? 8 : 0) +
            (nameOverlap ? 4 : 0) +
            (job.category && r.category === job.category ? 3 : 0) +
            (r.employerSlug === job.employerSlug ? 2 : 0) +
            (job.region && r.region === job.region ? 1 : 0) +
            keywordHits * 0.5,
        };
      })
      .sort(
        (a, b) => b.rank - a.rank || b.publishedAt.getTime() - a.publishedAt.getTime(),
      )
      .slice(0, limit)
      .map(({ slug, title, employerName, employerHomepage, location }) => ({
        slug,
        title,
        employerName,
        employerHomepage,
        location,
      }));
  },
);
