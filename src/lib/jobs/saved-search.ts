import "server-only";

import { Prisma } from "@prisma/client";

import { sendMail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { absoluteUrl } from "@/lib/seo/siteConfig";

import { jobWhereSql } from "./filters";
import { getRegisterIndex } from "./registers";
import { parseJobbSearchParams } from "./search-params";

/**
 * Matching av nye stillinger mot lagrede søk — kjøres i enrich-cronen etter
 * at batchen er beriket (facettene må finnes før filtrene kan treffe).
 * Dedup: SavedSearchHit-PK garanterer maks ett varsel per (stilling, søk).
 * In-app + push sendes umiddelbart; e-post umiddelbart kun for søk med
 * emailFrequency="umiddelbart" (én e-post per søk per kjøring), resten
 * samles av daglig digest (savedsearch-digest-cronen).
 */

export type SavedSearchMatchResult = {
  searchesChecked: number;
  newHits: number;
  notificationsCreated: number;
  pushesSent: number;
  immediateEmails: number;
  errors: string[];
};

// Øvre grense per kjøring — én WHERE-spørring per søk. Ved vekst forbi dette:
// inverter (match jobbens facetter mot søk-kriterier i minne) før semantikken
// endres. log-linje i resultatet viser når taket nås.
const MAX_SEARCHES_PER_RUN = 500;

export async function matchSavedSearchesForJobs(
  jobIds: string[],
): Promise<SavedSearchMatchResult> {
  const result: SavedSearchMatchResult = {
    searchesChecked: 0,
    newHits: 0,
    notificationsCreated: 0,
    pushesSent: 0,
    immediateEmails: 0,
    errors: [],
  };
  if (jobIds.length === 0) return result;

  const searches = await prisma.savedSearch.findMany({
    take: MAX_SEARCHES_PER_RUN,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      name: true,
      query: true,
      emailEnabled: true,
      inAppEnabled: true,
      pushEnabled: true,
      emailFrequency: true,
      user: { select: { email: true } },
    },
  });
  if (searches.length === MAX_SEARCHES_PER_RUN) {
    result.errors.push(`tak nådd: kun ${MAX_SEARCHES_PER_RUN} søk sjekket`);
  }
  if (searches.length === 0) return result;

  const index = await getRegisterIndex();

  type Hit = { search: (typeof searches)[number]; jobs: MatchedJob[] };
  const hits: Hit[] = [];

  for (const search of searches) {
    result.searchesChecked += 1;
    try {
      const raw = Object.fromEntries(
        [...new URLSearchParams(search.query).entries()].map(([k, v]) => [k, v]),
      );
      const { filter } = parseJobbSearchParams(raw, index);
      const matched = await prisma.$queryRaw<MatchedJob[]>`
        SELECT j.id, j.slug, j.title, j."employerName", j.kommune
        FROM "Job" j
        WHERE ${jobWhereSql(filter)} AND j.id IN (${Prisma.join(jobIds)})
      `;
      if (matched.length === 0) continue;

      const existing = await prisma.savedSearchHit.findMany({
        where: { savedSearchId: search.id, jobId: { in: matched.map((m) => m.id) } },
        select: { jobId: true },
      });
      const seen = new Set(existing.map((e) => e.jobId));
      const fresh = matched.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) continue;

      await prisma.savedSearchHit.createMany({
        data: fresh.map((m) => ({ savedSearchId: search.id, jobId: m.id })),
        skipDuplicates: true,
      });
      result.newHits += fresh.length;
      hits.push({ search, jobs: fresh });
    } catch (err) {
      result.errors.push(
        `søk ${search.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (hits.length === 0) return result;

  // In-app: én notifikasjon per (søk, kjøring) — lenker til søket.
  const notifications = hits
    .filter((h) => h.search.inAppEnabled)
    .map((h) => ({
      userId: h.search.userId,
      title:
        h.jobs.length === 1
          ? `Nytt treff på «${h.search.name}»`
          : `${h.jobs.length} nye treff på «${h.search.name}»`,
      body:
        h.jobs.length === 1
          ? `${h.jobs[0].title} hos ${h.jobs[0].employerName}`
          : h.jobs
              .slice(0, 2)
              .map((j) => j.title)
              .join(", ") + (h.jobs.length > 2 ? " m.fl." : ""),
      url: `/jobb?${h.search.query}`,
    }));
  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
    result.notificationsCreated = notifications.length;
  }

  // Push: samme innhold, til alle abonnementer for brukere med push på.
  const pushHits = hits.filter((h) => h.search.pushEnabled);
  if (pushHits.length > 0) {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: [...new Set(pushHits.map((h) => h.search.userId))] } },
      select: { userId: true, endpoint: true, auth: true, p256dh: true },
    });
    const byUser = new Map<string, typeof subs>();
    for (const s of subs) {
      const list = byUser.get(s.userId) ?? [];
      list.push(s);
      byUser.set(s.userId, list);
    }
    for (const h of pushHits) {
      for (const sub of byUser.get(h.search.userId) ?? []) {
        const ok = await sendPush(sub, {
          title: `Nye treff på «${h.search.name}»`,
          body: `${h.jobs.length} ny${h.jobs.length === 1 ? "" : "e"} stilling${h.jobs.length === 1 ? "" : "er"} matcher søket ditt`,
          url: `/jobb?${h.search.query}`,
          tag: `savedsearch-${h.search.id}`,
        });
        if (ok) result.pushesSent += 1;
      }
    }
  }

  // E-post umiddelbart (default er daglig digest — håndteres av egen cron).
  for (const h of hits) {
    if (!h.search.emailEnabled || h.search.emailFrequency !== "umiddelbart") continue;
    try {
      await sendMail({
        to: h.search.user.email,
        ...buildHitsEmail(h.search.name, h.search.query, h.jobs),
      });
      await prisma.savedSearchHit.updateMany({
        where: { savedSearchId: h.search.id, jobId: { in: h.jobs.map((j) => j.id) } },
        data: { emailedAt: new Date() },
      });
      result.immediateEmails += 1;
    } catch (err) {
      result.errors.push(
        `e-post ${h.search.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}

type MatchedJob = {
  id: string;
  slug: string;
  title: string;
  employerName: string;
  kommune: string | null;
};

export function buildHitsEmail(
  searchName: string,
  query: string,
  jobs: MatchedJob[],
): { subject: string; html: string } {
  const rows = jobs
    .slice(0, 10)
    .map(
      (j) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee9df;">
          <a href="${absoluteUrl(`/jobb/${j.slug}`)}" style="color: #14110e; text-decoration: none; font-weight: 600;">${escapeHtml(j.title)}</a>
          <div style="color: #777; font-size: 13px; margin-top: 2px;">${escapeHtml(j.employerName)}${j.kommune ? ` · ${escapeHtml(j.kommune)}` : ""}</div>
        </td>
      </tr>`,
    )
    .join("");
  const more =
    jobs.length > 10
      ? `<p style="color:#777; font-size:13px;">+ ${jobs.length - 10} flere treff</p>`
      : "";
  return {
    subject:
      jobs.length === 1
        ? `Nytt treff på «${searchName}»: ${jobs[0].title}`
        : `${jobs.length} nye treff på «${searchName}»`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #14110e;">Nye stillinger matcher «${escapeHtml(searchName)}»</h2>
        <table style="width: 100%; border-collapse: collapse;">${rows}</table>
        ${more}
        <p style="text-align: center; margin: 28px 0;">
          <a href="${absoluteUrl(`/jobb?${query}`)}" style="display: inline-block; padding: 12px 28px; background: #D5592E; color: #fff; text-decoration: none; border-radius: 100px; font-weight: 600;">
            Se alle treff
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">Du får denne fordi du har lagret søket «${escapeHtml(searchName)}» på Søknadsbasen. Administrer varsler under <a href="${absoluteUrl("/app/lagrede-sok")}" style="color: #999;">Lagrede søk</a>.</p>
      </div>
    `,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
