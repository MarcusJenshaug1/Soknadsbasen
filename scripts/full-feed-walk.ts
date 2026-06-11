/**
 * Komplett re-walk av pam-stilling-feed med EGEN lokal cursor — rører aldri
 * den delte NavFeedCursor, så prod-cronen kan kjøre uforstyrret samtidig.
 * Henter inn gamle-men-aktive annonser som initial-syncen hoppet over
 * (fast-forward-hullet: 25 % av aktive annonser manglet).
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/full-feed-walk.ts [--reset]
 *
 * State i /tmp/sb-full-walk-state.json — avbrutt kjøring fortsetter der den
 * slapp; --reset starter fra feed-roten. Egen fast-forward på 250 dager
 * (NAV-annonser lever maks ~6 mnd). Husk enrich-backfill etterpå.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { prisma } from "../src/lib/prisma";
import {
  FEED_ROOT,
  fetchFeedPage,
  getNavToken,
  invalidateNavToken,
} from "../src/lib/jobs/nav-feed";
import { processItems } from "../src/lib/jobs/sync";

const STATE_FILE = "/tmp/sb-full-walk-state.json";
const SKIP_OLDER_THAN_DAYS = 250;
const MAX_PAGES_PER_RUN = 5000;

type WalkState = { nextUrl: string | null; pagesDone: number; inserted: number };

function loadState(): WalkState {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as WalkState;
  } catch {
    return { nextUrl: null, pagesDone: 0, inserted: 0 };
  }
}

async function main() {
  const state = process.argv.includes("--reset")
    ? { nextUrl: null, pagesDone: 0, inserted: 0 }
    : loadState();
  let pagePath = state.nextUrl ?? FEED_ROOT;
  let token = await getNavToken();
  const cutoff = Date.now() - SKIP_OLDER_THAN_DAYS * 86_400_000;
  let skipped = 0;

  for (let i = 0; i < MAX_PAGES_PER_RUN; i++) {
    let page;
    try {
      page = await fetchFeedPage(pagePath, token, {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/-> 40[13]/.test(msg)) {
        await invalidateNavToken();
        token = await getNavToken();
        page = await fetchFeedPage(pagePath, token, {});
      } else {
        throw err;
      }
    }
    if (page.status === 304 || !page.body) break;

    const { body, lastModified } = page;
    const pageTime = lastModified ? new Date(lastModified).getTime() : NaN;
    const tooOld = !Number.isNaN(pageTime) && pageTime < cutoff;

    if (tooOld) {
      skipped += 1;
    } else if ((body.items ?? []).length > 0) {
      const r = await processItems(body.items, token);
      state.inserted += r.inserted;
      if (r.errors.length > 0) {
        console.error(`  side ${state.pagesDone}: ${r.errors.slice(0, 2).join("; ")}`);
      }
    }

    state.pagesDone += 1;
    state.nextUrl = body.next_url ?? null;
    writeFileSync(STATE_FILE, JSON.stringify(state));

    if (state.pagesDone % 50 === 0) {
      console.log(
        `side ${state.pagesDone} (${skipped} hoppet som for gamle), +${state.inserted} nye så langt`,
      );
    }
    if (!body.next_url) {
      console.log(`TAIL nådd etter ${state.pagesDone} sider, +${state.inserted} nye totalt`);
      writeFileSync(STATE_FILE, JSON.stringify({ ...state, nextUrl: "DONE" }));
      const active = await prisma.job.count({ where: { isActive: true } });
      console.log(`Aktive jobber i DB nå: ${active}`);
      return;
    }
    pagePath = body.next_url;
  }
  console.log(`Stoppet ved sidegrense — kjør igjen for å fortsette (side ${state.pagesDone})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
