import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo/siteConfig";

/**
 * Finner brukerens eksisterende pipeline-kladd for en stilling (lagret via
 * /api/jobb/[slug]/save). cache(): hurtigvisning og full side deler rundturen.
 */
export const getSavedApplicationId = cache(
  async (userId: string, slug: string): Promise<string | null> => {
    const app = await prisma.jobApplication.findFirst({
      where: {
        userId,
        OR: [{ jobUrl: absoluteUrl(`/jobb/${slug}`) }, { jobUrl: `/jobb/${slug}` }],
      },
      select: { id: true },
    });
    return app?.id ?? null;
  },
);
