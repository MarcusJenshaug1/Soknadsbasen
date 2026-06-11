import "server-only";

import { prisma } from "@/lib/prisma";
import { claudeGenerate } from "@/lib/claude";
import { parseLooseJson } from "@/lib/json";

import {
  ERFARING_CODES,
  FORERKORT_CODES,
  HJEMMEKONTOR_CODES,
  SPRAK_CODES,
  UTDANNING_CODES,
  coerceErfaring,
  coerceForerkort,
  coerceHjemmekontor,
  coerceSprak,
  coerceUtdanning,
} from "./facets";
import { extractJobKeywords } from "./format";
import { computeMatchesForJobs } from "./match";

/**
 * Beriker stillinger med ÉN Haiku-call per jobb: ATS-nøkkelord (samme regler
 * som /api/ai/job-keywords) + de 5 facettene som ikke finnes i NAV-feeden
 * (utdanning, erfaring, førerkort, arbeidsspråk, hjemmekontor).
 *
 * Frikoblet fra feed-sync: kjøres av cron /api/cron/jobs-enrich etter hver
 * jobs-sync, så feed-tilgjengelighet aldri avhenger av Anthropic-oppetid.
 * Structured output garanterer parsebar JSON med gyldige enum-verdier;
 * koersjonen i facets.ts validerer likevel før DB-skriving.
 */

const ENRICH_MODEL = "claude-haiku-4-5";
const LLM_CONCURRENCY = 5;
const LLM_TIMEOUT_MS = 30_000;

export type EnrichResult = {
  selected: number;
  enriched: number;
  matchRowsWritten: number;
  staleMatchesDeleted: number;
  durationMs: number;
  errors: string[];
};

export const ENRICH_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    keywords: { type: "array", items: { type: "string" } },
    education: {
      type: "array",
      items: { type: "string", enum: [...UTDANNING_CODES] },
    },
    experience: {
      anyOf: [{ type: "string", enum: [...ERFARING_CODES] }, { type: "null" }],
    },
    driversLicense: {
      type: "array",
      items: { type: "string", enum: [...FORERKORT_CODES] },
    },
    workLanguages: {
      type: "array",
      items: { type: "string", enum: [...SPRAK_CODES] },
    },
    remote: {
      anyOf: [
        { type: "string", enum: [...HJEMMEKONTOR_CODES] },
        { type: "null" },
      ],
    },
  },
  required: [
    "keywords",
    "education",
    "experience",
    "driversLicense",
    "workLanguages",
    "remote",
  ],
  additionalProperties: false,
};

export const ENRICH_SYSTEM = `Du er en ATS-spesialist som analyserer norske stillingsannonser. Returner JSON med to ting: ATS-nøkkelord og strukturerte krav.

DEL 1 — "keywords":
- 15-25 nøkkelord, sortert etter viktighet (viktigst først).
- BEHOLD ALLE NAV-klassifiserte termer (gitt i prompten) — de er kanonisk yrkesvokabular.
- LEGG TIL fra stillingsteksten: synonymer/varianter av jobbtittel, tekniske ferdigheter (React, SQL, Excel, AutoCAD), verktøy/plattformer (Salesforce, SAP, Figma, Azure), konsepter/metoder (CI/CD, agile, prosjektledelse), domener/bransjer, sertifiseringer, språk-krav, soft skills KONKRET nevnt.
- EKSKLUDER: stedsnavn, datoer, annonse-metadata, generiske ord (jobb, rolle, kandidat), bedriftsnavn.
- Korte termer (1-3 ord). Lowercase med mindre egennavn.

DEL 2 — strukturerte krav (tolkes fra annonseteksten; vær konservativ — bruk null/tomt når annonsen ikke sier noe eksplisitt):
- "education": utdanningskrav som liste. "ingen-krav" KUN når annonsen eksplisitt sier at utdanning ikke kreves eller åpenbart retter seg mot ufaglærte. Flere nivåer er lov ("bachelor eller relevant fagbrev" -> ["bachelor","fagbrev"]). Tom liste = ikke oppgitt.
- "experience": "ingen" (ingen krav/nyutdannede velkomne), "noe" (1-3 år), "mye" (4+ år / senior). null = ikke oppgitt.
- "driversLicense": førerkortklasser som kreves (B, BE, C, D). C1/CE regnes som C; D1/DE som D. Tom liste = ikke nevnt.
- "workLanguages": språk som kreves eller brukes i arbeidet (norsk, engelsk, skandinavisk, samisk). "Du må beherske norsk" -> ["norsk"]. Tom liste = ikke oppgitt.
- "remote": "hjemmekontor" (helt remote), "hybrid" (delvis), "ikke-mulig" (eksplisitt oppmøteplikt/stedbundet arbeid som butikk, helse, bygg). null = ikke oppgitt.`;

export type EnrichableJob = {
  id: string;
  title: string;
  employerName: string;
  description: string;
  category: string | null;
  occupation: string | null;
  categoryList: unknown;
  occupationList: unknown;
};

export function buildEnrichPrompt(job: EnrichableJob, navKeywords: string[]): string {
  return [
    `Stilling: ${job.title}`,
    `Selskap: ${job.employerName}`,
    job.category ? `Hovedkategori: ${job.category}` : "",
    navKeywords.length > 0
      ? `NAV-klassifisering (BEHOLD disse i keywords): ${navKeywords.join(", ")}`
      : "",
    "",
    "=== STILLINGSTEKST ===",
    job.description.replace(/<[^>]+>/g, " ").slice(0, 6000),
    "=== SLUTT ===",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Beriker én jobb og skriver resultatet. Eksportert for backfill-scriptet
 * (som gjenbruker parsingen, men kjører selve LLM-kallene via Batches API).
 */
export async function enrichJob(job: EnrichableJob): Promise<void> {
  const navKeywords = extractJobKeywords({
    category: job.category,
    occupation: job.occupation,
    categoryList: job.categoryList,
    occupationList: job.occupationList,
  });

  const raw = await claudeGenerate(buildEnrichPrompt(job, navKeywords), {
    model: ENRICH_MODEL,
    system: ENRICH_SYSTEM,
    maxOutputTokens: 1000,
    jsonSchema: ENRICH_SCHEMA,
  });

  await applyEnrichment(job.id, raw, navKeywords);
}

/**
 * Parser LLM-output (koersjon mot kanoniske koder), merger NAV-taksonomi inn
 * i keywords (samme dedup som /api/ai/job-keywords) og skriver alt i ETT
 * prisma.job.update.
 */
export async function applyEnrichment(
  jobId: string,
  rawLlmOutput: string,
  navKeywords: string[],
): Promise<void> {
  const parsed = parseLooseJson(rawLlmOutput) as {
    keywords?: unknown;
    education?: unknown;
    experience?: unknown;
    driversLicense?: unknown;
    workLanguages?: unknown;
    remote?: unknown;
  };

  const aiOnly = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        .map((k) => k.trim())
    : [];
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const kw of [...aiOnly, ...navKeywords]) {
    const key = kw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(kw);
  }

  const now = new Date();
  await prisma.job.update({
    where: { id: jobId },
    data: {
      aiKeywords: keywords.slice(0, 30),
      aiKeywordsAt: now,
      aiEducation: coerceUtdanning(parsed.education),
      aiExperience: coerceErfaring(parsed.experience),
      aiDriversLicense: coerceForerkort(parsed.driversLicense),
      aiWorkLanguages: coerceSprak(parsed.workLanguages),
      aiRemote: coerceHjemmekontor(parsed.remote),
      aiFacetsAt: now,
    },
  });
}

export const ENRICH_JOB_SELECT = {
  id: true,
  title: true,
  employerName: true,
  description: true,
  category: true,
  occupation: true,
  categoryList: true,
  occupationList: true,
} as const;

/**
 * Cron-entrypoint: beriker neste batch uberikede/stale jobber, beregner
 * match-scores for dem, og sweeper JobMatch-rader for deaktiverte jobber.
 * Utvalget krever raw SQL pga. kolonne-mot-kolonne-sammenligningen
 * (sourceUpdatedAt > aiFacetsAt = NAV oppdaterte annonsen etter berikelse).
 */
export async function enrichPendingJobs(opts: {
  budgetMs?: number;
  batchSize?: number;
} = {}): Promise<EnrichResult> {
  const start = Date.now();
  const budget = opts.budgetMs ?? 50_000;
  const batchSize = Math.min(200, Math.max(1, opts.batchSize ?? 50));
  const result: EnrichResult = {
    selected: 0,
    enriched: 0,
    matchRowsWritten: 0,
    staleMatchesDeleted: 0,
    durationMs: 0,
    errors: [],
  };

  const pendingIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Job"
    WHERE "isActive"
      AND ("aiFacetsAt" IS NULL OR ("sourceUpdatedAt" IS NOT NULL AND "sourceUpdatedAt" > "aiFacetsAt"))
    ORDER BY "publishedAt" DESC
    LIMIT ${batchSize}
  `;
  result.selected = pendingIds.length;

  const jobs = pendingIds.length
    ? await prisma.job.findMany({
        where: { id: { in: pendingIds.map((r) => r.id) } },
        select: ENRICH_JOB_SELECT,
      })
    : [];

  const enrichedIds: string[] = [];
  for (let i = 0; i < jobs.length; i += LLM_CONCURRENCY) {
    if (Date.now() - start > budget) break;
    const slice = jobs.slice(i, i + LLM_CONCURRENCY);
    const outcomes = await Promise.all(
      slice.map(async (job) => {
        try {
          await Promise.race([
            enrichJob(job),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("enrich timeout 30s")), LLM_TIMEOUT_MS),
            ),
          ]);
          return { id: job.id, error: null };
        } catch (err) {
          return {
            id: null,
            error: `${job.id}: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }),
    );
    for (const o of outcomes) {
      if (o.id) enrichedIds.push(o.id);
      if (o.error) result.errors.push(o.error);
    }
  }
  result.enriched = enrichedIds.length;

  if (enrichedIds.length > 0) {
    try {
      result.matchRowsWritten = await computeMatchesForJobs(enrichedIds);
    } catch (err) {
      result.errors.push(
        `computeMatchesForJobs: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Sweep: JobMatch-rader for jobber som er deaktivert siden sist. Eventual
  // consistency innen en time er ok — liste-spørringen joiner uansett isActive.
  try {
    result.staleMatchesDeleted = await prisma.$executeRaw`
      DELETE FROM "JobMatch" m
      USING "Job" j
      WHERE m."jobId" = j.id AND NOT j."isActive"
    `;
  } catch (err) {
    result.errors.push(
      `stale match sweep: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  result.durationMs = Date.now() - start;
  return result;
}
