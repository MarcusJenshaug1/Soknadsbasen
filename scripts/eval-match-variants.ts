/**
 * Evaluerer match-scoring-varianter mot et uttrukket datasett (eval-dataset.json)
 * og dommer-fasit (eval-judgments.json). Ingen DB-tilgang — alt offline.
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/eval-match-variants.ts <datasett> [fasit]
 *
 * Datasett-format (lages av eval-extract.sql):
 *   { user: { resumeText, role, cvKeywords: string[] },
 *     jobs: [{ id, title, jobTitle, category, occupation, categoryList, occupationList,
 *              aiKeywords, kommuner, regioner, description, prodScore }] }
 * Fasit-format: { [jobId]: 0|1|2|3 }  (0=irrelevant, 1=svak, 2=beslektet, 3=god match)
 */

import { readFileSync } from "node:fs";

import {
  normalizeMatchText,
  scoreJobMatch,
  termMatches,
  type CvMatchProfile,
  type JobMatchSide,
} from "../src/lib/jobs/match-scoring";

type EvalJob = {
  id: string;
  title: string;
  jobTitle: string | null;
  category: string | null;
  occupation: string | null;
  categoryList: { name?: string }[] | null;
  occupationList: { name?: string }[] | null;
  aiKeywords: string[];
  kommuner: string[] | null;
  regioner: string[] | null;
  description: string;
  prodScore: number | null;
};

type Dataset = {
  user: { resumeText: string; role: string; cvKeywords: string[]; homeKommune?: string; homeRegion?: string };
  jobs: EvalJob[];
};

const names = (v: { name?: string }[] | null) =>
  (v ?? []).map((x) => x.name ?? "").filter(Boolean);

function toSide(j: EvalJob): JobMatchSide {
  return {
    keywords: j.aiKeywords,
    title: j.title,
    occupationTerms: [
      j.category ?? "",
      j.occupation ?? "",
      j.jobTitle ?? "",
      ...names(j.categoryList),
      ...names(j.occupationList),
    ].filter(Boolean),
  };
}

// ---------- Varianter ----------

/** V0: prod-algoritmen (match-scoring.ts v2) som baseline. */
function v0_prod(cv: CvMatchProfile, j: EvalJob): number {
  return scoreJobMatch(cv, toSide(j));
}

/** V1: IDF-vektet dekning — sjeldne nøkkelord teller mer enn generiske. */
function makeV1(jobs: EvalJob[]) {
  const df = new Map<string, number>();
  for (const j of jobs) {
    for (const kw of new Set(j.aiKeywords.map(normalizeMatchText))) {
      df.set(kw, (df.get(kw) ?? 0) + 1);
    }
  }
  const N = jobs.length;
  const idf = (kw: string) => Math.log(1 + N / (1 + (df.get(normalizeMatchText(kw)) ?? 0)));
  return function v1_idf(cv: CvMatchProfile, j: EvalJob): number {
    const kws = j.aiKeywords.filter(Boolean);
    if (kws.length === 0) return 0;
    let gained = 0;
    let possible = 0;
    for (const kw of kws) {
      const w = idf(kw);
      possible += w;
      if (termMatches(cv.text, kw)) gained += w;
    }
    const coverage = possible > 0 ? gained / possible : 0;
    // yrkesaffinitet + tittel som i v2 (uendret) — kun dekningen er IDF-vektet
    const side = toSide(j);
    const jobOccText = normalizeMatchText([side.title, ...side.occupationTerms].join(" "));
    const cvTerms = [cv.role, ...cv.cvKeywords].filter(Boolean).slice(0, 15);
    const affinity =
      cvTerms.length > 0
        ? cvTerms.filter((t) => termMatches(jobOccText, t)).length / cvTerms.length
        : 0;
    const jobTitle = normalizeMatchText(side.title);
    const titleHit =
      cv.role && termMatches(jobTitle, cv.role)
        ? 1
        : Math.min(1, cvTerms.slice(0, 8).filter((t) => termMatches(jobTitle, t)).length / 2);
    return Math.round(Math.min(1, (0.5 * coverage + 0.3 * affinity + 0.2 * titleHit) * 2.5) * 100);
  };
}

/** V2: F1-kombinasjon — straffer ensidige treff (god dekning men feil yrke, og motsatt). */
function v2_f1(cv: CvMatchProfile, j: EvalJob): number {
  const side = toSide(j);
  const kws = side.keywords.filter(Boolean);
  if (kws.length === 0) return 0;
  const covered = kws.filter((kw) => termMatches(cv.text, kw)).length / kws.length;
  const jobOccText = normalizeMatchText([side.title, ...side.occupationTerms].join(" "));
  const cvTerms = [cv.role, ...cv.cvKeywords].filter(Boolean).slice(0, 15);
  const affinity =
    cvTerms.length > 0
      ? cvTerms.filter((t) => termMatches(jobOccText, t)).length / cvTerms.length
      : 0;
  const f1 = covered + affinity > 0 ? (2 * covered * affinity) / (covered + affinity) : 0;
  const jobTitle = normalizeMatchText(side.title);
  const titleBonus = cv.role && termMatches(jobTitle, cv.role) ? 0.15 : 0;
  return Math.round(Math.min(1, (f1 + titleBonus) * 2.8) * 100);
}

/** V3: geo-vektet — prod-score multiplisert med lokasjonstreff (krever homeKommune/homeRegion). */
function makeV3(home: { kommune?: string; region?: string }) {
  return function v3_geo(cv: CvMatchProfile, j: EvalJob): number {
    const base = v0_prod(cv, j);
    if (!home.kommune && !home.region) return base;
    const kommuner = (j.kommuner ?? []).map((k) => k.toLowerCase());
    const regioner = (j.regioner ?? []).map((r) => r.toLowerCase());
    let geo = 0.55; // annen landsdel
    if (home.kommune && kommuner.includes(home.kommune.toLowerCase())) geo = 1.0;
    else if (home.region && regioner.includes(home.region.toLowerCase())) geo = 0.85;
    return Math.round(base * geo);
  };
}

/** V4: Jaccard på nøkkelordmengdene (CV-keywords ∩ jobb-keywords) + titteltreff. */
function v4_jaccard(cv: CvMatchProfile, j: EvalJob): number {
  const a = new Set(cv.cvKeywords.map(normalizeMatchText).filter(Boolean));
  const b = new Set(j.aiKeywords.map(normalizeMatchText).filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
    else {
      for (const y of b) {
        if (y.length > 4 && (y.startsWith(x) || x.startsWith(y))) { inter += 0.5; break; }
      }
    }
  }
  const jac = inter / (a.size + b.size - inter);
  const titleBonus =
    cv.role && termMatches(normalizeMatchText(j.title), cv.role) ? 0.1 : 0;
  return Math.round(Math.min(1, jac * 4 + titleBonus) * 100);
}

/** V5: TF-IDF-cosinus mellom CV-fulltekst og jobbtekst (tittel + keywords + description). */
function makeV5(jobs: EvalJob[]) {
  const tokenize = (s: string) =>
    normalizeMatchText(s).split(" ").filter((t) => t.length > 2);
  const docs = jobs.map((j) =>
    tokenize([j.title, j.aiKeywords.join(" "), j.description.slice(0, 3000)].join(" ")),
  );
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  const idf = (t: string) => Math.log(1 + N / (1 + (df.get(t) ?? 0)));
  const vec = (tokens: string[]) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v = new Map<string, number>();
    let norm = 0;
    for (const [t, f] of tf) {
      const w = (1 + Math.log(f)) * idf(t);
      v.set(t, w);
      norm += w * w;
    }
    return { v, norm: Math.sqrt(norm) };
  };
  return function makeScorer(cv: CvMatchProfile) {
    const cvVec = vec(tokenize(cv.text));
    return (j: EvalJob, idx: number): number => {
      const jv = vec(docs[idx]);
      if (cvVec.norm === 0 || jv.norm === 0) return 0;
      let dot = 0;
      for (const [t, w] of jv.v) dot += (cvVec.v.get(t) ?? 0) * w;
      const cos = dot / (cvVec.norm * jv.norm);
      return Math.round(Math.min(1, cos * 3.3) * 100);
    };
  };
}

/** V6: rang-fusjon (gjennomsnitt av persentilrang for V1, V4, V5) — ensemble. */
function rankFusion(scoreLists: number[][]): number[] {
  const n = scoreLists[0].length;
  const ranks = scoreLists.map((scores) => {
    const order = scores.map((s, i) => [s, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(n);
    order.forEach(([, i], rank) => { r[i] = rank / (n - 1 || 1); });
    return r;
  });
  return Array.from({ length: n }, (_, i) =>
    Math.round((ranks.reduce((sum, r) => sum + r[i], 0) / ranks.length) * 100),
  );
}

// ---------- Metrikker ----------

function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(xs.length);
    let i = 0;
    while (i < order.length) {
      let k = i;
      while (k + 1 < order.length && order[k + 1][0] === order[i][0]) k++;
      const avg = (i + k) / 2;
      for (let m = i; m <= k; m++) r[order[m][1]] = avg;
      i = k + 1;
    }
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb);
    va += (ra[i] - ma) ** 2;
    vb += (rb[i] - mb) ** 2;
  }
  return va && vb ? cov / Math.sqrt(va * vb) : 0;
}

function ndcgAt(k: number, scores: number[], rel: number[]): number {
  const order = scores.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]);
  const dcg = order.slice(0, k).reduce((s, [, i], pos) => s + (2 ** rel[i] - 1) / Math.log2(pos + 2), 0);
  const ideal = [...rel].sort((a, b) => b - a).slice(0, k)
    .reduce((s, r, pos) => s + (2 ** r - 1) / Math.log2(pos + 2), 0);
  return ideal ? dcg / ideal : 0;
}

// ---------- Kjøring ----------

const datasetPath = process.argv[2] ?? "eval-dataset.json";
const judgmentsPath = process.argv[3];
const ds: Dataset = JSON.parse(readFileSync(datasetPath, "utf8"));

const cv: CvMatchProfile = {
  text: normalizeMatchText(ds.user.resumeText),
  role: normalizeMatchText(ds.user.role),
  cvKeywords: ds.user.cvKeywords,
};

const v1 = makeV1(ds.jobs);
const v3 = makeV3({ kommune: ds.user.homeKommune, region: ds.user.homeRegion });
const v5scorer = makeV5(ds.jobs)(cv);

const variantScores: Record<string, number[]> = {
  "V0 prod (v2)": ds.jobs.map((j) => v0_prod(cv, j)),
  "V1 IDF-vektet": ds.jobs.map((j) => v1(cv, j)),
  "V2 F1-balansert": ds.jobs.map((j) => v2_f1(cv, j)),
  "V3 geo-vektet": ds.jobs.map((j) => v3(cv, j)),
  "V4 Jaccard-keywords": ds.jobs.map((j) => v4_jaccard(cv, j)),
  "V5 TF-IDF-cosinus": ds.jobs.map((j, i) => v5scorer(j, i)),
};
variantScores["V6 rang-fusjon(1,4,5)"] = rankFusion([
  variantScores["V1 IDF-vektet"],
  variantScores["V4 Jaccard-keywords"],
  variantScores["V5 TF-IDF-cosinus"],
]);

// V7: F1-balansert × geo-multiplikator (kommune 1.0 / fylke 0.85 / ellers 0.55).
const home = { kommune: ds.user.homeKommune, region: ds.user.homeRegion };
variantScores["V7 F1 x geo"] = ds.jobs.map((j, i) => {
  const base = variantScores["V2 F1-balansert"][i];
  if (!home.kommune && !home.region) return base;
  const kommuner = (j.kommuner ?? []).map((k) => k.toLowerCase());
  const regioner = (j.regioner ?? []).map((r) => r.toLowerCase());
  let geo = 0.55;
  if (home.kommune && kommuner.includes(home.kommune)) geo = 1.0;
  else if (home.region && regioner.includes(home.region)) geo = 0.85;
  return Math.round(base * geo);
});

// V8: F1 der dekningen er IDF-vektet (kombinerer V1- og V2-ideene).
const v8idf = (() => {
  const df = new Map<string, number>();
  for (const j of ds.jobs) {
    for (const kw of new Set(j.aiKeywords.map(normalizeMatchText))) {
      df.set(kw, (df.get(kw) ?? 0) + 1);
    }
  }
  const N = ds.jobs.length;
  return (kw: string) => Math.log(1 + N / (1 + (df.get(normalizeMatchText(kw)) ?? 0)));
})();
variantScores["V8 F1 m/IDF-dekning"] = ds.jobs.map((j) => {
  const side = toSide(j);
  const kws = side.keywords.filter(Boolean);
  if (kws.length === 0) return 0;
  let gained = 0;
  let possible = 0;
  for (const kw of kws) {
    const w = v8idf(kw);
    possible += w;
    if (termMatches(cv.text, kw)) gained += w;
  }
  const covered = possible > 0 ? gained / possible : 0;
  const jobOccText = normalizeMatchText([side.title, ...side.occupationTerms].join(" "));
  const cvTerms = [cv.role, ...cv.cvKeywords].filter(Boolean).slice(0, 15);
  const affinity =
    cvTerms.length > 0
      ? cvTerms.filter((t) => termMatches(jobOccText, t)).length / cvTerms.length
      : 0;
  const f1 = covered + affinity > 0 ? (2 * covered * affinity) / (covered + affinity) : 0;
  const titleBonus =
    cv.role && termMatches(normalizeMatchText(side.title), cv.role) ? 0.15 : 0;
  return Math.round(Math.min(1, (f1 + titleBonus) * 2.8) * 100);
});

if (!judgmentsPath) {
  // Uten fasit: skriv score-tabell for dommer-runden (topp/bunn-sjekk for øyet).
  const rows = ds.jobs.map((j, i) => ({
    id: j.id,
    title: j.title.slice(0, 60),
    ...Object.fromEntries(Object.entries(variantScores).map(([k, v]) => [k, v[i]])),
  }));
  console.log(JSON.stringify(rows, null, 1));
} else {
  const judgments: Record<string, number> = JSON.parse(readFileSync(judgmentsPath, "utf8"));
  const rel = ds.jobs.map((j) => judgments[j.id] ?? 0);
  console.log(`Datasett: ${ds.jobs.length} jobber, fasit: ${Object.keys(judgments).length} dommer\n`);
  console.log("Variant".padEnd(24), "Spearman", "NDCG@10", "NDCG@20", "Topp10-presisjon(rel>=2)");
  for (const [name, scores] of Object.entries(variantScores)) {
    const sp = spearman(scores, rel).toFixed(3);
    const n10 = ndcgAt(10, scores, rel).toFixed(3);
    const n20 = ndcgAt(20, scores, rel).toFixed(3);
    const top10 = scores.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 10);
    const prec = (top10.filter(([, i]) => rel[i] >= 2).length / 10).toFixed(2);
    console.log(name.padEnd(24), sp.padStart(8), n10.padStart(7), n20.padStart(7), prec.padStart(8));
  }
}
