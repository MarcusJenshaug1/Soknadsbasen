import "server-only";

import { prisma } from "@/lib/prisma";

import { normalizeMatchText, type KeywordIdf } from "./match-scoring";
import { createSingleFlightCache } from "./single-flight-cache";

/**
 * DB-avledet IDF for jobb-nøkkelord: idf(kw) = ln(1 + N / (1 + df(kw))),
 * der df = antall aktive jobber som har nøkkelordet. Sjeldne, spesifikke
 * nøkkelord («typescript», «sykepleierautorisasjon») veier dermed mye mer i
 * ferdighetsdekningen enn allestedsværende («norsk», «kommunikasjon») — se
 * match-scoring.ts (v3) for hvorfor.
 *
 * 6 t TTL i prosess-lokal single-flight-cache: vokabularet driver sakte
 * (feed-sync hvert 5. min endrer df marginalt), og én aggregering over
 * aiKeywords er billig mot lokal Postgres. Ukjente nøkkelord får df=0 →
 * maks-IDF, som er riktig (de er per definisjon sjeldne).
 */

type IdfData = { totalJobs: number; df: Map<string, number> };

const idfCache = createSingleFlightCache<IdfData>(6 * 3_600_000);

export async function getKeywordIdf(): Promise<KeywordIdf> {
  const { totalJobs, df } = await idfCache("idf", async () => {
    const [rows, totalJobs] = await Promise.all([
      prisma.$queryRaw<{ kw: string; c: bigint }[]>`
        SELECT kw, count(DISTINCT id) AS c
        FROM "Job", unnest("aiKeywords") kw
        WHERE "isActive"
        GROUP BY kw
      `,
      prisma.job.count({ where: { isActive: true } }),
    ]);
    const df = new Map<string, number>();
    for (const row of rows) {
      const key = normalizeMatchText(row.kw);
      if (!key) continue;
      // Kasing-/normaliseringsvarianter av samme nøkkelord slås sammen.
      df.set(key, (df.get(key) ?? 0) + Number(row.c));
    }
    return { totalJobs, df };
  });

  return (keyword) =>
    Math.log(1 + totalJobs / (1 + (df.get(normalizeMatchText(keyword)) ?? 0)));
}
