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

/**
 * Lignende stillinger: kategori veier mest, så arbeidsgiver, så region —
 * samme rangering som detaljsiden alltid har brukt. cache() deler rundturen
 * mellom hurtigvisning og full side i samme request.
 */
export const getRelatedJobs = cache(
  async (
    job: {
      slug: string;
      category: string | null;
      employerSlug: string;
      region: string | null;
    },
    limit: number,
  ): Promise<RelatedJob[]> => {
    const orFilters: Array<Record<string, string>> = [];
    if (job.category) orFilters.push({ category: job.category });
    if (job.employerSlug) orFilters.push({ employerSlug: job.employerSlug });
    if (job.region) orFilters.push({ region: job.region });
    if (orFilters.length === 0) return [];

    const candidates = await prisma.job.findMany({
      where: { isActive: true, slug: { not: job.slug }, OR: orFilters },
      select: {
        slug: true,
        title: true,
        employerName: true,
        employerHomepage: true,
        location: true,
        category: true,
        employerSlug: true,
        region: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: Math.max(6, limit + 2),
    });

    return candidates
      .map((r) => ({
        ...r,
        rank:
          (r.category === job.category ? 4 : 0) +
          (r.employerSlug === job.employerSlug ? 2 : 0) +
          (r.region === job.region ? 1 : 0),
      }))
      .sort((a, b) => b.rank - a.rank || b.publishedAt.getTime() - a.publishedAt.getTime())
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
