import "server-only";
import type { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Candidate = {
  job: Job;
  score: number;
  breakdown: {
    city: number;
    occupation: number;
    employer: number;
    freshness: number;
  };
};

const FRESHNESS_WINDOW_HOURS = 48;
const MIN_DESCRIPTION_LEN = 200;
const POOL_LIMIT = 200;

const CITY_SCORES: Array<{ match: RegExp; score: number }> = [
  { match: /\boslo\b/i, score: 1.0 },
  { match: /\b(bergen|trondheim|stavanger)\b/i, score: 0.9 },
  { match: /\b(troms[oø]|kristiansand|drammen|fredrikstad|sandnes|sandefjord|asker|b[æa]rum)\b/i, score: 0.7 },
];

const POPULAR_OCCUPATION_PATTERNS: Array<{ match: RegExp; score: number }> = [
  { match: /(utvikler|programmer|softw|developer|frontend|backend|fullstack|devops)/i, score: 1.0 },
  { match: /(sykepleier|helsefag|lege|tannlege|psykolog|fysioterapeut|jordmor|helse)/i, score: 1.0 },
  { match: /(l[æa]rer|pedagog|barnehage|underviser|adjunkt|lektor)/i, score: 1.0 },
  { match: /(ingeni[oø]r|sivilingeni[oø]r|engineer)/i, score: 1.0 },
  { match: /(prosjektleder|project manager|teamleder|avdelingsleder)/i, score: 1.0 },
  { match: /(salg|selger|sales|account manager|key account)/i, score: 1.0 },
  { match: /(kundeservice|kunderådgiver|customer success)/i, score: 1.0 },
  { match: /(regnskap|controller|økonomi|revisor)/i, score: 1.0 },
  { match: /(h[åa]ndverk|elektriker|tømrer|r[øo]rlegger|maler|snekker)/i, score: 0.6 },
  { match: /(transport|sj[åa]f[øo]r|logistikk|lager)/i, score: 0.5 },
];

const EMPLOYER_WHITELIST = [
  "telenor",
  "dnb",
  "equinor",
  "nrk",
  "posten",
  "vy",
  "bring",
  "norsk tipping",
  "statkraft",
  "yara",
  "orkla",
  "schibsted",
  "finn",
  "tine",
  "nortura",
  "sparebank 1",
  "if forsikring",
  "gjensidige",
  "storebrand",
  "kpmg",
  "ey",
  "deloitte",
  "pwc",
  "accenture",
  "bouvet",
  "sopra steria",
  "capgemini",
  "kommune",
  "fylkeskommune",
  "helse sør-øst",
  "helse vest",
  "helse nord",
  "helse midt",
  "oslo universitetssykehus",
  "haukeland",
  "st. olavs",
];

export async function pickLinkedInCandidates(limit = 3): Promise<Candidate[]> {
  const cutoff = new Date(Date.now() - FRESHNESS_WINDOW_HOURS * 3600_000);

  const pool = await prisma.job.findMany({
    where: {
      isActive: true,
      publishedAt: { gte: cutoff },
      linkedInPosts: { none: {} },
    },
    orderBy: { publishedAt: "desc" },
    take: POOL_LIMIT,
  });

  const filtered = pool.filter(
    (j) => (j.description?.length ?? 0) >= MIN_DESCRIPTION_LEN && j.title.trim().length > 0,
  );

  if (filtered.length === 0) return [];

  const employerCounts = await getEmployerActivityCounts(
    filtered.map((j) => j.employerOrgnr).filter((s): s is string => !!s),
  );

  const scored: Candidate[] = filtered.map((job) => {
    const city = scoreCity(job);
    const occupation = scoreOccupation(job);
    const employer = scoreEmployer(job, employerCounts);
    const freshness = scoreFreshness(job);

    const total =
      city * 3 +
      occupation * 3 +
      employer * 2 +
      freshness * 1 +
      Math.random() * 0.05;

    return {
      job,
      score: total,
      breakdown: { city, occupation, employer, freshness },
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function scoreCity(job: Job): number {
  const haystack = `${job.location ?? ""} ${job.region ?? ""}`;
  for (const { match, score } of CITY_SCORES) {
    if (match.test(haystack)) return score;
  }
  return 0.3;
}

function scoreOccupation(job: Job): number {
  const haystack = [
    job.title,
    job.category,
    job.occupation,
    job.jobTitle,
    JSON.stringify(job.categoryList ?? ""),
    JSON.stringify(job.occupationList ?? ""),
  ]
    .filter(Boolean)
    .join(" ");

  let best = 0.2;
  for (const { match, score } of POPULAR_OCCUPATION_PATTERNS) {
    if (match.test(haystack) && score > best) best = score;
  }
  return best;
}

function scoreEmployer(
  job: Job,
  counts: Map<string, number>,
): number {
  const name = (job.employerName ?? "").toLocaleLowerCase("nb-NO");
  for (const w of EMPLOYER_WHITELIST) {
    if (name.includes(w)) return 1.0;
  }

  if (job.employerOrgnr) {
    const c = counts.get(job.employerOrgnr) ?? 0;
    if (c > 5) return 0.6;
    if (c > 2) return 0.3;
  }
  return 0.2;
}

function scoreFreshness(job: Job): number {
  const ageMs = Date.now() - job.publishedAt.getTime();
  const ageHours = ageMs / 3600_000;
  if (ageHours < 12) return 1.0;
  if (ageHours < 24) return 0.7;
  if (ageHours < 48) return 0.3;
  return 0.0;
}

async function getEmployerActivityCounts(orgnrs: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (orgnrs.length === 0) return map;

  const since = new Date(Date.now() - 30 * 86400_000);
  const rows = await prisma.job.groupBy({
    by: ["employerOrgnr"],
    where: {
      employerOrgnr: { in: Array.from(new Set(orgnrs)) },
      isActive: true,
      publishedAt: { gte: since },
    },
    _count: { _all: true },
  });

  for (const r of rows) {
    if (r.employerOrgnr) map.set(r.employerOrgnr, r._count._all);
  }
  return map;
}
