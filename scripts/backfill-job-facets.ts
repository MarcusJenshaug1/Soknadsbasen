/**
 * Engangs-backfill: AI-beriker alle aktive jobber uten aiFacetsAt via
 * Anthropic Message Batches API (50 % rabatt vs. synkrone kall), og bygger
 * deretter JobMatch for alle brukere med CV-keywords.
 *
 * Kjøring (fra maskin med DATABASE_URL/DIRECT_URL + ANTHROPIC_API_KEY i env):
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/backfill-job-facets.ts
 *
 * scripts/tsconfig.json mapper "server-only" til en tom stub — pakka finnes
 * ikke på toppnivå i node_modules (Next håndterer importen internt).
 * Scriptet er idempotent: avbrutt kjøring plukker opp der den slapp
 * (utvalget er aiFacetsAt IS NULL). Kostnad ~$0.0015/jobb via Batches.
 */

import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "../src/lib/prisma";
import {
  ENRICH_JOB_SELECT,
  ENRICH_SCHEMA,
  ENRICH_SYSTEM,
  applyEnrichment,
  buildEnrichPrompt,
  type EnrichableJob,
} from "../src/lib/jobs/enrich";
import { extractJobKeywords } from "../src/lib/jobs/format";
import { computeMatchesForUser } from "../src/lib/jobs/match";

const MODEL = "claude-haiku-4-5";
const BATCH_CHUNK = 10_000; // godt under 100k-requests/256MB-grensene
const POLL_INTERVAL_MS = 60_000;

async function main() {
  const jobs = await prisma.job.findMany({
    where: { isActive: true, aiFacetsAt: null },
    select: ENRICH_JOB_SELECT,
  });
  console.log(`${jobs.length} aktive jobber uten aiFacetsAt`);
  if (jobs.length === 0) {
    await backfillMatches();
    return;
  }

  const client = new Anthropic({ maxRetries: 4 });
  const navKeywordsById = new Map<string, string[]>();
  for (const job of jobs) {
    navKeywordsById.set(
      job.id,
      extractJobKeywords({
        category: job.category,
        occupation: job.occupation,
        categoryList: job.categoryList,
        occupationList: job.occupationList,
      }),
    );
  }

  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i += BATCH_CHUNK) {
    const chunk = jobs.slice(i, i + BATCH_CHUNK);
    console.log(`Sender batch ${i / BATCH_CHUNK + 1} (${chunk.length} jobber)…`);

    const batch = await client.messages.batches.create({
      requests: chunk.map((job) => ({
        custom_id: job.id,
        params: {
          model: MODEL,
          max_tokens: 1000,
          system: ENRICH_SYSTEM,
          messages: [
            {
              role: "user" as const,
              content: buildEnrichPrompt(
                job as EnrichableJob,
                navKeywordsById.get(job.id) ?? [],
              ),
            },
          ],
          output_config: {
            format: { type: "json_schema" as const, schema: ENRICH_SCHEMA },
          },
        },
      })),
    });

    let status = batch;
    while (status.processing_status !== "ended") {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      status = await client.messages.batches.retrieve(batch.id);
      console.log(
        `  ${batch.id}: ${status.processing_status} — ${status.request_counts.succeeded} ok, ${status.request_counts.errored} feilet, ${status.request_counts.processing} gjenstår`,
      );
    }

    for await (const result of await client.messages.batches.results(batch.id)) {
      if (result.result.type !== "succeeded") {
        failed += 1;
        console.error(`  ${result.custom_id}: ${result.result.type}`);
        continue;
      }
      const text = result.result.message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      try {
        await applyEnrichment(
          result.custom_id,
          text,
          navKeywordsById.get(result.custom_id) ?? [],
        );
        enriched += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `  ${result.custom_id}: skriving feilet — ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    console.log(`  Skrevet så langt: ${enriched} ok, ${failed} feilet`);
  }

  console.log(`Berikelse ferdig: ${enriched} ok, ${failed} feilet`);
  await backfillMatches();

  // Tersklene valideres mot faktisk fordeling (jf. plan): juster
  // MATCH_THRESHOLDS i src/lib/jobs/match.ts hvis persentilene tilsier det.
  const pct = await prisma.$queryRaw<{ p50: number; p75: number; p90: number }[]>`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY score) AS p50,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY score) AS p75,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY score) AS p90
    FROM "JobMatch"
  `;
  console.log("JobMatch score-persentiler:", pct[0]);
}

/** Initial JobMatch-backfill for alle brukere som har CV-keywords. */
async function backfillMatches() {
  const users = await prisma.userData.findMany({
    where: { aiKeywordsHash: { not: null } },
    select: { userId: true },
  });
  console.log(`Bygger JobMatch for ${users.length} brukere…`);
  for (const u of users) {
    const n = await computeMatchesForUser(u.userId);
    console.log(`  ${u.userId}: ${n} rader`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
