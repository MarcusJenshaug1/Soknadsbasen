import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Deduplikerer prisma.job.findUnique mellom generateMetadata og page-bodyen
// i samme request. Uten cache() blir det 2 rundturer per detail-render.
export const getJobBySlug = cache(async (slug: string) => {
  return prisma.job.findUnique({ where: { slug } });
});
