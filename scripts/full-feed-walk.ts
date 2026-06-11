/**
 * Komplett re-walk av pam-stilling-feed UTEN fast-forward — henter inn
 * gamle-men-aktive annonser som initial-syncen hoppet over (25 %-hullet).
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/full-feed-walk.ts [--reset]
 *
 * --reset nullstiller cursoren først (start fra feed-roten, 400 dager
 * lookback). Kjører syncNavJobs i loop til tail; cursoren er delt med
 * prod-cronen, så avbrudd er ufarlig — begge fortsetter samme walk.
 * Husk enrich-backfill (backfill-job-facets.ts) etterpå for nye rader.
 */

import { prisma } from "../src/lib/prisma";
import { syncNavJobs } from "../src/lib/jobs/sync";

async function main() {
  if (process.argv.includes("--reset")) {
    await prisma.navFeedCursor.deleteMany({ where: { id: "singleton" } });
    console.log("Cursor nullstilt — starter fra feed-roten (400 d lookback)");
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalPages = 0;
  for (let round = 1; round <= 200; round++) {
    const r = await syncNavJobs({ budgetMs: 120_000, fullSync: true });
    totalInserted += r.inserted;
    totalUpdated += r.updated;
    totalPages += r.pagesProcessed;
    console.log(
      `runde ${round}: ${r.pagesProcessed} sider, +${r.inserted} nye, ~${r.updated} oppdatert, ${r.deactivated} deaktivert${r.errors.length ? `, feil: ${r.errors.slice(0, 2).join("; ")}` : ""}`,
    );
    if (r.reachedTail) {
      console.log(
        `TAIL nådd: totalt ${totalPages} sider, +${totalInserted} nye, ~${totalUpdated} oppdatert`,
      );
      break;
    }
  }

  const active = await prisma.job.count({ where: { isActive: true } });
  console.log(`Aktive jobber i DB nå: ${active}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
