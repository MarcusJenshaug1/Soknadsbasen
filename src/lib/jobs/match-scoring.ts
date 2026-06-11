/**
 * Match-scoring v2: CV ↔ jobb i BEGGE retninger, ren og testbar (ingen IO).
 *
 * v1 (scoreAtsFromNormalized) hadde tre strukturelle problemer:
 *  1. CV-globale bonuser (sammendrag 0.08 + kompletthet 0.12) ga en komplett
 *     CV et 20-poengs gulv på ALLE jobber — irrelevante stillinger landet
 *     som «Middels». Ranking ble ikke påvirket (konstant offset), men
 *     tier-labelene løy.
 *  2. Ren substring-matching: nøkkelordet «it» traff «kvalitet», «b2b» traff
 *     ingenting-relevant, korte termer = støy.
 *  3. Alle nøkkelord veide likt, og matchingen gikk kun én vei (jobbens krav
 *     søkt i CV-en). En jobb med få/generiske nøkkelord («norsk»,
 *     «kommunikasjon») scoret høyt for alle.
 *
 * v2: 100 × min(1, 0.5×ferdighetsdekning + 0.3×yrkesaffinitet + 0.2×titteltreff)
 *  - Ferdighetsdekning (jobb → CV): andel av jobbens nøkkelord funnet i
 *    CV-teksten, ordgrense-matchet, vektet etter viktighet (LLM/NAV sorterer
 *    viktigst først — topp 5 teller 1,5×).
 *  - Yrkesaffinitet (CV → jobb): andel av CV-ens topp-yrkestermer (aiKeywords
 *    + rolle) som treffer jobbens yrkesside (tittel, kategori, occupation).
 *    Dette er den motsatte retningen — en sykepleier-CV treffer ikke
 *    utvikler-jobbens yrkesside uansett hvor mange generiske krav som dekkes.
 *  - Titteltreff: rolle/topp-termer i selve annonsetittelen — høypresisjons-
 *    signal begge veier.
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

const TOP_WEIGHT_COUNT = 5;
const TOP_WEIGHT = 1.5;
const AFFINITY_TERMS = 15;
const TITLE_TERMS = 8;

export function scoreJobMatch(cv: CvMatchProfile, job: JobMatchSide): number {
  const keywords = job.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) return 0;

  // 1) Ferdighetsdekning (jobb → CV), viktighetsvektet.
  let gained = 0;
  let possible = 0;
  keywords.forEach((kw, i) => {
    const w = i < TOP_WEIGHT_COUNT ? TOP_WEIGHT : 1;
    possible += w;
    if (termMatches(cv.text, kw)) gained += w;
  });
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

  // 3) Titteltreff: gradert — rolle i tittel = fullt, ellers andel topp-termer.
  const jobTitle = normalizeMatchText(job.title);
  let titleHit = 0;
  if (cv.role && termMatches(jobTitle, cv.role)) {
    titleHit = 1;
  } else {
    const top = cvTerms.slice(0, TITLE_TERMS);
    const hits = top.filter((t) => termMatches(jobTitle, t)).length;
    titleHit = top.length > 0 ? Math.min(1, hits / 2) : 0;
  }

  const raw = 0.5 * coverage + 0.3 * affinity + 0.2 * titleHit;
  return Math.round(Math.min(1, raw) * 100);
}
