import type { ResumeData } from "@/store/useResumeStore";

const STOPWORDS = new Set([
  "og", "i", "på", "for", "med", "av", "til", "en", "et", "den", "det", "som", "du", "deg", "vi", "vår", "vårt", "våre",
  "the", "and", "for", "with", "you", "your", "our", "are", "that", "this", "will", "from", "into", "have", "has",
  "job", "stilling", "rollen", "rolle", "stillingen", "candidate", "kandidat", "company", "selskap",
]);

const PHRASES = [
  "react",
  "next.js",
  "typescript",
  "javascript",
  "node.js",
  "tailwind",
  "sql",
  "graphql",
  "figma",
  "seo",
  "google analytics",
  "performance marketing",
  "content marketing",
  "crm",
  "a/b testing",
  "ui design",
  "ux design",
  "product management",
  "project management",
  "agile",
  "scrum",
  "api",
  "rest api",
  "azure",
  "aws",
  "docker",
  "git",
  "python",
  "java",
  "c#",
  "communication",
  "leadership",
  "sales",
  "b2b",
  "b2c",
];

export interface AtsAnalysis {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestedRole: string | null;
  recommendedTemplateId: "ats-clean" | "ats-professional" | null;
  summary: string[];
}

export function analyzeAtsMatch(data: ResumeData, jobAd: string): AtsAnalysis {
  const keywords = extractKeywords(normalize(jobAd));
  return analyzeAtsWithKeywords(data, keywords, {
    jobAd,
    suggestedRole: extractSuggestedRole(jobAd),
  });
}

export type NormalizedResume = {
  text: string;
  role: string;
  summaryLength: number;
  hasSummary: boolean;
  hasRole: boolean;
  experienceCount: number;
  skillsCount: number;
  templateId: string;
};

/**
 * Pre-normaliser resume-tekst én gang. Brukes når vi skal score mange jobs
 * i samme request (f.eks. /jobb match-sort med 200+ kandidater).
 * Sparer 200×normalize() per match-render.
 */
export function buildNormalizedResume(data: ResumeData): NormalizedResume {
  const text = normalize([
    data.role,
    data.summary,
    data.skills.join(" "),
    data.experience.map((item) => [item.title, item.company, item.description].join(" ")).join(" "),
    data.education.map((item) => [item.degree, item.field, item.school, item.description].join(" ")).join(" "),
    data.projects.map((item) => [item.name, item.role, item.description].join(" ")).join(" "),
    data.certifications.map((item) => [item.name, item.issuer].join(" ")).join(" "),
  ].join(" "));
  return {
    text,
    role: data.role ?? "",
    summaryLength: data.summary.trim().length,
    hasSummary: Boolean(data.summary?.trim()),
    hasRole: Boolean(data.role?.trim()),
    experienceCount: data.experience.length,
    skillsCount: data.skills.length,
    templateId: data.templateId,
  };
}

/**
 * Score-only fast path. Sparer ~70% CPU per kall sammenlignet med å
 * gjenoppbygge full AtsAnalysis. Bruk til /jobb match-sort.
 */
export function scoreAtsFromNormalized(
  normalized: NormalizedResume,
  keywords: string[],
): number {
  const trimmed = keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  if (trimmed.length === 0) return 0;
  let matched = 0;
  for (const k of trimmed) {
    if (normalized.text.includes(normalize(k))) matched++;
  }
  const keywordCoverage = matched / trimmed.length;
  const summaryBonus = normalized.summaryLength > 120 ? 0.08 : 0;
  const completenessBonus =
    ([
      normalized.hasSummary,
      normalized.hasRole,
      normalized.experienceCount > 0,
      normalized.skillsCount > 0,
    ].filter(Boolean).length /
      4) *
    0.12;
  const raw = Math.min(1, keywordCoverage * 0.68 + summaryBonus + completenessBonus);
  return Math.round(raw * 100);
}

export function analyzeAtsWithKeywords(
  data: ResumeData,
  keywords: string[],
  opts: { jobAd?: string; suggestedRole?: string | null } = {},
): AtsAnalysis {
  const normalizedJobAd = opts.jobAd ? normalize(opts.jobAd) : "";
  const resumeText = normalize([
    data.role,
    data.summary,
    data.skills.join(" "),
    data.experience.map((item) => [item.title, item.company, item.description].join(" ")).join(" "),
    data.education.map((item) => [item.degree, item.field, item.school, item.description].join(" ")).join(" "),
    data.projects.map((item) => [item.name, item.role, item.description].join(" ")).join(" "),
    data.certifications.map((item) => [item.name, item.issuer].join(" ")).join(" "),
  ].join(" "));

  const normalizedKeywords = keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  const matchedKeywords = normalizedKeywords.filter((keyword) =>
    resumeText.includes(normalize(keyword)),
  );
  const missingKeywords = normalizedKeywords.filter(
    (keyword) => !resumeText.includes(normalize(keyword)),
  );

  const keywordCoverage =
    normalizedKeywords.length > 0
      ? matchedKeywords.length / normalizedKeywords.length
      : 0;
  const roleBonus =
    data.role && normalizedJobAd && normalizedJobAd.includes(normalize(data.role))
      ? 0.12
      : 0;
  const summaryBonus = data.summary.trim().length > 120 ? 0.08 : 0;
  const completenessBonus =
    ([data.summary, data.role, data.experience.length, data.skills.length].filter(Boolean)
      .length /
      4) *
    0.12;

  const rawScore = Math.min(
    1,
    keywordCoverage * 0.68 + roleBonus + summaryBonus + completenessBonus,
  );
  const score = Math.round(rawScore * 100);

  const summary: string[] = [];
  if (matchedKeywords.length > 0) {
    summary.push(
      `CV-en matcher ${matchedKeywords.length} av ${normalizedKeywords.length || 1} viktige nøkkelord fra annonsen.`,
    );
  }
  if (missingKeywords.length > 0) {
    summary.push(
      `Vurder å få inn ${missingKeywords.slice(0, 4).join(", ")} i rolle, profil eller erfaring hvis det er relevant.`,
    );
  }
  if (!data.templateId.startsWith("ats-")) {
    summary.push(
      "For denne jobben kan en ATS-mal gjøre CV-en enklere å lese for rekrutteringssystemer.",
    );
  }

  return {
    score,
    matchedKeywords,
    missingKeywords,
    suggestedRole: opts.suggestedRole ?? null,
    recommendedTemplateId: data.templateId.startsWith("ats-") ? null : "ats-clean",
    summary,
  };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(jobAd: string): string[] {
  const phraseMatches = PHRASES.filter((phrase) => jobAd.includes(phrase));

  const singles = jobAd
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word) && !/^\d+$/.test(word));

  const counts = new Map<string, number>();
  for (const word of singles) counts.set(word, (counts.get(word) ?? 0) + 1);

  const frequent = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .filter((word) => word.length > 4)
    .slice(0, 16);

  return [...new Set([...phraseMatches, ...frequent])].slice(0, 14);
}

function extractSuggestedRole(jobAd: string): string | null {
  const patterns = [
    /stilling som ([^.\n,]+)/i,
    /rolle som ([^.\n,]+)/i,
    /we are looking for (?:an?|the) ([^.\n,]+)/i,
    /søker (?:en|ei|et) ([^.\n,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = jobAd.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/^som\s+/i, "").slice(0, 80);
    }
  }

  return null;
}