/**
 * Høster resultater fra en ALLEREDE INNSENDT message batch (backfill-job-facets)
 * og skriver dem til DB. Brukes når backfill-prosessen ble avbrutt mens batchen
 * fortsatt kjørte hos Anthropic — unngår å sende (og betale for) ny batch.
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/harvest-job-facets.ts <batch-id>
 *
 * Exit-koder: 0 = ferdig høstet, 2 = batch fortsatt in_progress (prøv igjen).
 * Idempotent — applyEnrichment overskriver med samme data ved re-kjøring.
 */

import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "../src/lib/prisma";
import {
  ENRICH_JOB_SELECT,
  applyEnrichment,
} from "../src/lib/jobs/enrich";
import { extractJobKeywords } from "../src/lib/jobs/format";
import { computeMatchesForUser } from "../src/lib/jobs/match";

async function main() {
  const batchId = process.argv[2];
  if (!batchId?.startsWith("msgbatch_")) {
    console.error("Bruk: harvest-job-facets.ts <msgbatch_...>");
    process.exit(1);
  }

  const client = new Anthropic({ maxRetries: 4 });
  const batch = await client.messages.batches.retrieve(batchId);
  console.log(
    `${batchId}: ${batch.processing_status} — ${batch.request_counts.succeeded} ok, ${batch.request_counts.errored} feilet, ${batch.request_counts.processing} gjenstår`,
  );
  if (batch.processing_status !== "ended") {
    process.exit(2);
  }

  // Forhåndslast alle kandidat-jobber i ÉN spørring — per-resultat findUnique
  // ville gitt ~10k sekvensielle rundturer mot Stockholm.
  const allJobs = await prisma.job.findMany({
    where: { isActive: true },
    select: ENRICH_JOB_SELECT,
  });
  const jobsById = new Map(allJobs.map((j) => [j.id, j]));
  console.log(`${jobsById.size} aktive jobber lastet for oppslag`);

  let enriched = 0;
  let failed = 0;
  const pending: { id: string; text: string }[] = [];
  for await (const result of await client.messages.batches.results(batchId)) {
    if (result.result.type !== "succeeded" || !jobsById.has(result.custom_id)) {
      failed += 1;
      continue;
    }
    const text = result.result.message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    pending.push({ id: result.custom_id, text });
  }
  console.log(`${pending.length} resultater å skrive`);

  // Parallelle skriv i chunks — sekvensielt ville gitt ~10k enkeltrundturer.
  const WRITE_CONCURRENCY = 8;
  for (let i = 0; i < pending.length; i += WRITE_CONCURRENCY) {
    const chunk = pending.slice(i, i + WRITE_CONCURRENCY);
    const outcomes = await Promise.all(
      chunk.map(async ({ id, text }) => {
        const job = jobsById.get(id)!;
        try {
          await applyEnrichment(
            id,
            text,
            extractJobKeywords({
              category: job.category,
              occupation: job.occupation,
              categoryList: job.categoryList,
              occupationList: job.occupationList,
            }),
          );
          return true;
        } catch (err) {
          console.error(`  ${id}: ${err instanceof Error ? err.message : err}`);
          return false;
        }
      }),
    );
    enriched += outcomes.filter(Boolean).length;
    failed += outcomes.filter((o) => !o).length;
    if (i % 1000 < WRITE_CONCURRENCY) console.log(`  ${enriched} skrevet…`);
  }
  console.log(`Høstet: ${enriched} ok, ${failed} feilet`);

  const users = await prisma.userData.findMany({
    where: { aiKeywordsHash: { not: null } },
    select: { userId: true },
  });
  console.log(`Bygger JobMatch for ${users.length} brukere…`);
  for (const u of users) {
    const n = await computeMatchesForUser(u.userId);
    console.log(`  ${u.userId}: ${n} rader`);
  }

  const pct = await prisma.$queryRaw<{ p50: number; p75: number; p90: number }[]>`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY score) AS p50,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY score) AS p75,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY score) AS p90
    FROM "JobMatch"
  `;
  console.log("JobMatch score-persentiler:", pct[0]);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
