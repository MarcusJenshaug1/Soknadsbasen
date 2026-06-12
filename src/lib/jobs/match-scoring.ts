/**
 * Match-scoring v3 («V8»): CV ↔ jobb i BEGGE retninger, ren og testbar
 * (ingen IO). Valgt etter variant-evalueringen 2026-06-12: 8 varianter målt
 * mot LLM-dommer-fasit (150 jobber, rubrikk 0–3) — v3 ga Spearman 0.897 /
 * NDCG@20 0.772 / topp10-presisjon 1.00, mot v2 sine 0.550 / 0.640 / 0.90.
 * Harness: scripts/eval-match-variants.ts.
 *
 * v2-svakheten den retter: lineær vekting (0.5·dekning + 0.3·affinitet +
 * 0.2·tittel) lot en jobb score høyt på ferdighetsdekning ALENE — generiske
 * nøkkelord («norsk», «kommunikasjon») finnes i enhver CV, så topisk feile
 * jobber slo topisk riktige.
 *
 * v3: 100 × min(1, (F1(dekning, affinitet) + tittelbonus) × 2.8)
 *  - Ferdighetsdekning (jobb → CV): IDF-vektet — sjeldne nøkkelord
 *    (TypeScript, sykepleierautorisasjon) teller mye mer enn allesteds-
 *    værende. IDF-funksjonen injiseres (DB-avledet i prod, se
 *    keyword-idf.ts); uten injisert IDF degraderer den til uvektet andel.
 *  - Yrkesaffinitet (CV → jobb): som v2 — andel av CV-ens topp-yrkestermer
 *    som treffer jobbens yrkesside (tittel, kategori, occupation).
 *  - F1 (harmonisk middel): BEGGE retninger må treffe — høy dekning med null
 *    affinitet (eller omvendt) gir lav score. Dette er hovedgevinsten.
 *  - Tittelbonus: +0.15 når CV-rollen står i selve annonsetittelen.
 * Ingen CV-globale bonuser: en irrelevant jobb scorer nær 0.
 */

export type CvMatchProfile = {
  /** Normalisert CV-fulltekst (normalizeMatchText). */
  text: string;
  /** Normalisert rolle («Fullstack-utvikler» → «fullstack-utvikler»). */
  role: string;
  /** CV-ens AI-nøkkelord, rånotasjon (normaliseres her). */
  cvKeywords: string[];
};

export type JobMatchSide = {
  /** Jobbens nøkkelord (aiKeywords + NAV-taksonomi), viktigst først. */
  keywords: string[];
  /** Annonsetittel, rå. */
  title: string;
  /** Yrkesside: kategori/occupation/jobTitle/categoryList-navn, rå. */
  occupationTerms: string[];
};

/**
 * Normalisering for matching: lowercase, æ/ø/å → ae/o/a (eksplisitt — NFKD
 * dekomponerer dem IKKE, så v1-normalize strippet dem og ødela norske ord),
 * diakritika vekk, kun [a-z0-9+#. -].
 */
export function normalizeMatchText(text: string): string {
  return text
    .toLocaleLowerCase("nb-NO")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#. -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Term-treff med ordgrense i starten: «sykepleier» treffer «sykepleiere»,
 * men «it» treffer ikke «kvalitet». Termer ≤ 3 tegn krever helt ord
 * (it/sql/php/c#); lengre termer får prefiks-fleksibilitet for bøyning.
 */
export function termMatches(normalizedText: string, rawTerm: string): boolean {
  const term = normalizeMatchText(rawTerm);
  if (!term) return false;
  const re =
    term.length <= 3
      ? new RegExp(`(?:^| )${escapeRe(term)}(?:$| )`)
      : new RegExp(`(?:^| )${escapeRe(term)}`);
  return re.test(normalizedText);
}

const AFFINITY_TERMS = 15;
const TITLE_BONUS = 0.15;
// Skala-strekk fra evalueringen: F1 for «klart riktig» jobb lander typisk
// 0.20–0.35 (reell dekning er langt under synthetic-perfekt); ×2.8 strekker
// dette mot 55–100 i kort-visningen. Irrelevante forblir ~0 (F1 ≈ 0).
const SCALE = 2.8;

/** IDF-vekt per nøkkelord (DB-avledet i prod). Uten: alle teller likt. */
export type KeywordIdf = (keyword: string) => number;

export function scoreJobMatch(
  cv: CvMatchProfile,
  job: JobMatchSide,
  idf?: KeywordIdf,
): number {
  const keywords = job.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) return 0;

  // 1) Ferdighetsdekning (jobb → CV), IDF-vektet.
  let gained = 0;
  let possible = 0;
  for (const kw of keywords) {
    const w = idf ? idf(kw) : 1;
    possible += w;
    if (termMatches(cv.text, kw)) gained += w;
  }
  const coverage = possible > 0 ? gained / possible : 0;

  // 2) Yrkesaffinitet (CV → jobb).
  const jobOccText = normalizeMatchText(
    [job.title, ...job.occupationTerms].join(" "),
  );
  const cvTerms = [cv.role, ...cv.cvKeywords]
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, AFFINITY_TERMS);
  const affinity =
    cvTerms.length > 0
      ? cvTerms.filter((t) => termMatches(jobOccText, t)).length / cvTerms.length
      : 0;

  // 3) F1: begge retninger må treffe — ensidige treff straffes hardt.
  const f1 =
    coverage + affinity > 0
      ? (2 * coverage * affinity) / (coverage + affinity)
      : 0;

  // 4) Tittelbonus: CV-rollen i selve annonsetittelen er høypresisjon.
  const titleBonus =
    cv.role && termMatches(normalizeMatchText(job.title), cv.role)
      ? TITLE_BONUS
      : 0;

  return Math.round(Math.min(1, (f1 + titleBonus) * SCALE) * 100);
}
