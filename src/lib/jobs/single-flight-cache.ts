import "server-only";

/**
 * Prosess-lokal TTL-cache med single-flight og stale-while-revalidate.
 *
 * Hendelse 2026-06-12: samtidige cache-miss på register-/facet-spørringene
 * startet hver sin tunge DB-revalidering (verken unstable_cache eller React
 * cache() deduper på tvers av samtidige requests) — 10+ parallelle kopier av
 * samme spørring monopoliserte alle pooler-backends og tok ned innlogging.
 * Appen er ÉN persistent prosess på Coolify, så et modul-nivå-memo gir full
 * dedupe: maks én kjørende spørring per nøkkel, uansett trafikk.
 */

type Entry<T> = {
  value?: T;
  fetchedAt: number;
  inflight: Promise<T> | null;
};

export function createSingleFlightCache<T>(ttlMs: number, maxEntries = 500) {
  const entries = new Map<string, Entry<T>>();

  return async function get(key: string, load: () => Promise<T>): Promise<T> {
    let entry = entries.get(key);
    if (!entry) {
      // Enkel overløps-vakt: nøklene er filterkombinasjoner og kan i teorien
      // vokse ubegrenset under bot-crawl. Full clear er ok — neste treff
      // refetcher, og single-flight hindrer stampede.
      if (entries.size >= maxEntries) entries.clear();
      entry = { fetchedAt: 0, inflight: null };
      entries.set(key, entry);
    }

    const isFresh =
      entry.value !== undefined && Date.now() - entry.fetchedAt < ttlMs;
    if (isFresh) return entry.value as T;

    let pending = entry.inflight;
    if (!pending) {
      const e = entry;
      pending = load()
        .then((value) => {
          e.value = value;
          e.fetchedAt = Date.now();
          return value;
        })
        .finally(() => {
          e.inflight = null;
        });
      entry.inflight = pending;
    }

    if (entry.value !== undefined) {
      // Stale-while-revalidate: server forrige verdi mens refresh kjører i
      // bakgrunnen. Feilende refresh skal ikke krasje noens request — men
      // logges, så vi ser det i container-loggen.
      pending.catch((err) => {
        console.error(`single-flight refresh feilet for "${key}":`, err);
      });
      return entry.value;
    }

    return pending;
  };
}
