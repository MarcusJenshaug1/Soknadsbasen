/**
 * Bygger eval-dataset.json fra rå-uttrekk (eval-raw.json) med repoets egne
 * CV-normaliseringsfunksjoner, så variantene scorer mot NØYAKTIG samme
 * tekstrepresentasjon som prod.
 *
 *   DATABASE_URL=postgresql://x DIRECT_URL=postgresql://x \
 *     npx tsx --tsconfig scripts/tsconfig.json scripts/build-eval-dataset.ts eval-raw.json
 */

import { readFileSync, writeFileSync } from "node:fs";

import { buildCvMatchText, normalizeResumeData } from "../src/lib/jobs/match";

type Raw = {
  userData: { resumeData: string; aiKeywords: string[] };
  homeKommune?: string;
  homeRegion?: string;
  jobs: unknown[];
};

const raw: Raw = JSON.parse(readFileSync(process.argv[2] ?? "eval-raw.json", "utf8"));
const resume = normalizeResumeData(raw.userData.resumeData);
if (!resume) throw new Error("kunne ikke parse resumeData");

const dataset = {
  user: {
    resumeText: buildCvMatchText(resume),
    role: resume.role,
    cvKeywords: raw.userData.aiKeywords,
    homeKommune: raw.homeKommune,
    homeRegion: raw.homeRegion,
  },
  jobs: raw.jobs,
};

writeFileSync("eval-dataset.json", JSON.stringify(dataset));
console.log(`eval-dataset.json: rolle="${resume.role}", ${raw.jobs.length} jobber`);
