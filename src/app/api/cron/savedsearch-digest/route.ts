import { NextRequest, NextResponse } from "next/server";

import { sendMail } from "@/lib/email";
import { buildHitsEmail } from "@/lib/jobs/saved-search";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daglig e-post-digest for lagrede søk (default-kanalen): samler alle
 * SavedSearchHit med emailedAt=null for søk med emailFrequency="daglig" og
 * sender ÉN e-post per søk. Kjøres morgen (pg_cron, samme CRON_SECRET-
 * mønster som jobs-sync/enrich). Umiddelbart-søk e-postes i enrich-flyten.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.savedSearchHit.findMany({
    where: {
      emailedAt: null,
      search: { emailEnabled: true, emailFrequency: "daglig" },
      job: { isActive: true },
    },
    select: {
      jobId: true,
      savedSearchId: true,
      job: {
        select: {
          id: true,
          slug: true,
          title: true,
          employerName: true,
          kommune: true,
        },
      },
      search: {
        select: { id: true, name: true, query: true, user: { select: { email: true } } },
      },
    },
    take: 2000,
  });

  const bySearch = new Map<string, typeof pending>();
  for (const hit of pending) {
    const list = bySearch.get(hit.savedSearchId) ?? [];
    list.push(hit);
    bySearch.set(hit.savedSearchId, list);
  }

  let emails = 0;
  const errors: string[] = [];
  for (const hits of bySearch.values()) {
    const { search } = hits[0];
    try {
      await sendMail({
        to: search.user.email,
        ...buildHitsEmail(
          search.name,
          search.query,
          hits.map((h) => h.job),
        ),
      });
      await prisma.savedSearchHit.updateMany({
        where: { savedSearchId: search.id, jobId: { in: hits.map((h) => h.jobId) } },
        data: { emailedAt: new Date() },
      });
      emails += 1;
    } catch (err) {
      errors.push(
        `digest ${search.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return NextResponse.json(
    { pendingHits: pending.length, emails, errors },
    { status: errors.length > 0 ? 207 : 200 },
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}
