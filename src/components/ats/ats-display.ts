/**
 * Klient-only ATS-display-helpers. Holdes adskilt fra `src/lib/ats.ts` som
 * inneholder server-side analyzeAtsMatch og lignende, sånn at marketing-
 * og pipeline-kortene kan dele score-tone, AI-match og lokal nøkkelord-match
 * uten å dra inn server-koden.
 */

export type AtsTone = {
  label: string;
  color: string;
};

export function scoreTone(score: number): AtsTone {
  if (score >= 80) return { label: "Sterk match", color: "#16a34a" };
  if (score >= 60) return { label: "God match", color: "#D5592E" };
  if (score >= 40) return { label: "Delvis match", color: "#f59e0b" };
  return { label: "Lav match", color: "#dc2626" };
}

export type AiMatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  source: "ai" | "nav" | "local";
};

/**
 * Beregn match-prosent fra to AI-genererte nøkkelord-lister. Brukes når
 * /api/ai/cv-keywords + /api/ai/job-keywords (eller server-cached versjoner)
 * leverer rå keyword-arrays.
 */
export function computeAiMatch(
  cvKw: string[],
  jobKw: string[],
): AiMatchResult | null {
  if (cvKw.length === 0 || jobKw.length === 0) return null;
  const cvLower = new Set(cvKw.map((k) => k.toLowerCase()));
  const matched = jobKw.filter((k) => cvLower.has(k.toLowerCase()));
  const missing = jobKw.filter((k) => !cvLower.has(k.toLowerCase()));
  const coverage = jobKw.length > 0 ? matched.length / jobKw.length : 0;
  return {
    score: Math.round(coverage * 100),
    matched,
    missing,
    source: "ai",
  };
}

type MinimalResume = {
  role?: string;
  summary?: string;
  skills?: string[];
  experience?: { title: string; company: string; description?: string }[];
};

function buildResumeText(data: MinimalResume): string {
  return [
    data.role ?? "",
    data.summary ?? "",
    (data.skills ?? []).join(" "),
    (data.experience ?? [])
      .map((e) => `${e.title} ${e.company} ${e.description ?? ""}`)
      .join(" "),
  ].join(" ");
}

function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Lokal substring-match som fallback når AI ikke gir resultat (f.eks. tom
 * cv-keywords-respons eller AI-cap rammet). Bruker NAV-keywords eller
 * tag-listen som "ground truth".
 */
export function matchLocalKeywords(
  resume: MinimalResume,
  keywords: string[],
): { score: number; matched: string[]; missing: string[] } {
  const text = normalizeForMatch(buildResumeText(resume));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    if (text.includes(normalizeForMatch(k))) matched.push(k);
    else missing.push(k);
  }
  const total = keywords.length || 1;
  return {
    score: Math.round((matched.length / total) * 100),
    matched,
    missing,
  };
}
