/**
 * Kalibrerer MATCH_THRESHOLDS for v3-scoringen: scorer hele den aktive
 * jobbmassen mot en reell CV med produksjons-IDF (avledet av samme massen),
 * og printer persentiler + score per dommer-relevansnivå fra eval-fasiten.
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/calibrate-thresholds.ts \
 *     /tmp/calib-jobs.json eval-dataset.json eval-judgments.json
 */

import { readFileSync } from "node:fs";

import {
  normalizeMatchText,
  scoreJobMatch,
  type CvMatchProfile,
  type JobMatchSide,
} from "../src/lib/jobs/match-scoring";

type CalibJob = {
  id: string;
  title: string;
  jobTitle: string | null;
  category: string | null;
  occupation: string | null;
  categoryList: { name?: string }[] | null;
  occupationList: { name?: string }[] | null;
  aiKeywords: string[];
};

const jobs: CalibJob[] = JSON.parse(readFileSync(process.argv[2], "utf8"));
const ds = JSON.parse(readFileSync(process.argv[3], "utf8"));
const judgments: Record<string, number> = JSON.parse(readFileSync(process.argv[4], "utf8"));

// Samme IDF-formel som keyword-idf.ts, avledet av hele den aktive massen.
const df = new Map<string, number>();
for (const j of jobs) {
  for (const kw of new Set(j.aiKeywords.map(normalizeMatchText))) {
    if (kw) df.set(kw, (df.get(kw) ?? 0) + 1);
  }
}
const N = jobs.length;
const idf = (kw: string) =>
  Math.log(1 + N / (1 + (df.get(normalizeMatchText(kw)) ?? 0)));

const names = (v: { name?: string }[] | null) =>
  (v ?? []).map((x) => x.name ?? "").filter(Boolean);

const cv: CvMatchProfile = {
  text: normalizeMatchText(ds.user.resumeText),
  role: normalizeMatchText(ds.user.role),
  cvKeywords: ds.user.cvKeywords,
};

const scores = jobs.map((j) => ({
  id: j.id,
  title: j.title,
  score: scoreJobMatch(cv, {
    keywords: j.aiKeywords,
    title: j.title,
    occupationTerms: [
      j.category ?? "",
      j.occupation ?? "",
      j.jobTitle ?? "",
      ...names(j.categoryList),
      ...names(j.occupationList),
    ].filter(Boolean),
  } satisfies JobMatchSide, idf),
}));

const sorted = scores.map((s) => s.score).sort((a, b) => a - b);
const pct = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
console.log(`n=${sorted.length}  p50=${pct(0.5)} p90=${pct(0.9)} p99=${pct(0.99)} p99.9=${pct(0.999)} max=${sorted[sorted.length - 1]}`);

const byScore = new Map(scores.map((s) => [s.id, s.score]));
for (const rel of [3, 2, 1, 0]) {
  const ss = Object.entries(judgments)
    .filter(([, r]) => r === rel)
    .map(([id]) => byScore.get(id))
    .filter((s): s is number => s !== undefined)
    .sort((a, b) => b - a);
  console.log(`rel=${rel} (n=${ss.length}):`, ss.join(" "));
}

console.log("\nTopp 15:");
for (const s of [...scores].sort((a, b) => b.score - a.score).slice(0, 15)) {
  console.log(String(s.score).padStart(3), s.title.slice(0, 70));
}
