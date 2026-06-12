import "server-only";

/**
 * Global semafor for tunge jobb-spørringer (facet-RPC, registre).
 *
 * Hvorfor: Prisma-poolen (15) er større enn det databasen tåler av samtidige
 * tunge skann under IO-press. Bot-crawl av distinkte filterkombinasjoner kan
 * fylle hele poolen med minutt-lange spørringer — da sultes Supabase Auth
 * (samme Postgres) og innlogging dør (hendelsen 2026-06-12). Taket her holder
 * backends ledige for auth og lette spørringer uansett /jobb-trafikk; tunge
 * spørringer køes i Node der ventingen er gratis.
 */

const MAX_CONCURRENT = 3;
const MAX_WAITERS = 200;

let running = 0;
const waiters: (() => void)[] = [];

export async function withHeavyQueryGate<T>(run: () => Promise<T>): Promise<T> {
  while (running >= MAX_CONCURRENT) {
    if (waiters.length >= MAX_WAITERS) {
      // Fail fast under flom: et raskt 500 på /jobb er bedre enn å stable
      // tusenvis av hengende requests frem til proxy-timeout.
      throw new Error("heavy-query-gate: for mange ventende tunge spørringer");
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  running++;
  try {
    return await run();
  } finally {
    running--;
    waiters.shift()?.();
  }
}
