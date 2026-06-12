/**
 * Omregner JobMatch for alle brukere med CV-keywords (etter scoring-endring
 * eller stor datainnhenting), og printer fordelingsstatistikk + topp-10 per
 * bruker for empirisk kalibrering av MATCH_THRESHOLDS.
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/recompute-matches.ts
 */

import { prisma } from "../src/lib/prisma";
import { computeMatchesForUser } from "../src/lib/jobs/match";

async function main() {
  const users = await prisma.userData.findMany({
    where: { aiKeywordsHash: { not: null } },
    select: { userId: true },
  });
  console.log(`Omregner matcher for ${users.length} brukere…`);
  for (const u of users) {
    const n = await computeMatchesForUser(u.userId);
    console.log(`  ${u.userId}: ${n} rader`);
  }

  const pct = await prisma.$queryRaw<
    { p50: number; p90: number; p99: number; max: number }[]
  >`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY score) AS p50,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY score) AS p90,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY score) AS p99,
      max(score) AS max
    FROM "JobMatch"
  `;
  console.log("Persentiler (alle par):", pct[0]);

  for (const u of users) {
    const top = await prisma.$queryRaw<{ score: number; title: string }[]>`
      SELECT m.score, j.title FROM "JobMatch" m
      JOIN "Job" j ON j.id = m."jobId"
      WHERE m."userId" = ${u.userId}::uuid
      ORDER BY m.score DESC LIMIT 10
    `;
    const bands = await prisma.$queryRaw<{ hoy: bigint; middels: bigint }[]>`
      SELECT count(*) FILTER (WHERE score >= 35) AS hoy,
             count(*) FILTER (WHERE score >= 18 AND score < 35) AS middels
      FROM "JobMatch" WHERE "userId" = ${u.userId}::uuid
    `;
    console.log(
      `\n${u.userId}: Høy(>=35)=${bands[0].hoy} Middels(18-34)=${bands[0].middels}`,
    );
    for (const t of top) console.log(`  ${String(t.score).padStart(3)} ${t.title.slice(0, 70)}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
