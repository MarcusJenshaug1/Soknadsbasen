import type { ResumeData } from "@/store/useResumeStore";

export type RequirementStatus = "covered" | "partial" | "gap";

export type RequirementMatch = {
  requirement: string;
  status: RequirementStatus;
  matchedWords: string[];
  category: "must" | "nice";
};

export type MatchScoreResult = {
  score: number;
  totalRequirements: number;
  coveredCount: number;
  partialCount: number;
  gapCount: number;
  matches: RequirementMatch[];
  summary: {
    mustCovered: number;
    mustTotal: number;
    niceCovered: number;
    niceTotal: number;
  };
};

const STOPWORDS = new Set([
  "og", "i", "er", "en", "et", "av", "til", "for", "med", "har", "som",
  "på", "om", "deg", "det", "den", "ved", "fra", "om", "vi", "du", "kan",
  "må", "skal", "gjør", "bli", "være", "blir", "vår", "din", "min", "ha",
  "the", "a", "an", "of", "to", "and", "or", "with", "for", "from", "in",
  "on", "at", "by", "is", "are", "be", "have", "has", "you", "we", "us",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "o")
    .replace(/[å]/g, "a")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function buildHaystack(resume: ResumeData): string {
  const parts: string[] = [];
  if (resume.role) parts.push(resume.role);
  if (resume.summary) parts.push(resume.summary);
  for (const e of resume.experience ?? []) {
    if (e.title) parts.push(e.title);
    if (e.company) parts.push(e.company);
    if (e.description) parts.push(e.description);
  }
  for (const e of resume.education ?? []) {
    if (e.degree) parts.push(e.degree);
    if (e.field) parts.push(e.field);
    if (e.school) parts.push(e.school);
  }
  for (const s of resume.skills ?? []) {
    if (typeof s === "string" && s.trim()) parts.push(s);
  }
  for (const c of resume.certifications ?? []) {
    if (c.name) parts.push(c.name);
    if (c.issuer) parts.push(c.issuer);
  }
  for (const l of resume.languages ?? []) {
    if (l.name) parts.push(l.name);
  }
  return parts.join(" ");
}

function matchRequirement(
  requirement: string,
  haystackTokens: Set<string>,
): { status: RequirementStatus; matched: string[] } {
  const reqTokens = tokenize(requirement);
  if (reqTokens.length === 0) return { status: "gap", matched: [] };

  const matched: string[] = [];
  for (const tok of reqTokens) {
    if (haystackTokens.has(tok)) {
      matched.push(tok);
      continue;
    }
    // partial: prefix match (4+ chars overlap)
    if (tok.length >= 4) {
      for (const ht of haystackTokens) {
        if (ht.startsWith(tok.slice(0, Math.min(tok.length, 6)))) {
          matched.push(tok);
          break;
        }
      }
    }
  }

  const ratio = matched.length / reqTokens.length;
  if (ratio >= 0.75) return { status: "covered", matched };
  if (ratio >= 0.4) return { status: "partial", matched };
  return { status: "gap", matched };
}

export type AnalyzeJobResult = {
  mustHave?: string[];
  niceToHave?: string[];
  responsibilities?: string[];
  redFlags?: string[];
  tone?: string;
  summary?: string;
};

export function computeMatchScore(
  analysis: AnalyzeJobResult,
  resume: ResumeData,
): MatchScoreResult {
  const haystack = buildHaystack(resume);
  const haystackTokens = new Set(tokenize(haystack));

  const must = (analysis.mustHave ?? []).slice(0, 12);
  const nice = (analysis.niceToHave ?? []).slice(0, 12);

  const matches: RequirementMatch[] = [];

  let mustCovered = 0;
  let mustPartial = 0;
  for (const req of must) {
    const { status, matched } = matchRequirement(req, haystackTokens);
    matches.push({ requirement: req, status, matchedWords: matched, category: "must" });
    if (status === "covered") mustCovered += 1;
    if (status === "partial") mustPartial += 1;
  }

  let niceCovered = 0;
  for (const req of nice) {
    const { status, matched } = matchRequirement(req, haystackTokens);
    matches.push({ requirement: req, status, matchedWords: matched, category: "nice" });
    if (status === "covered") niceCovered += 1;
  }

  // Score: must-have er 75% av poeng, nice 25%
  const mustWeight = must.length > 0 ? 75 : 0;
  const niceWeight = nice.length > 0 ? 25 : 0;
  const fallbackWeight = mustWeight + niceWeight === 0 ? 100 : 0;

  const mustScore =
    must.length > 0
      ? ((mustCovered + mustPartial * 0.5) / must.length) * mustWeight
      : 0;
  const niceScore =
    nice.length > 0 ? (niceCovered / nice.length) * niceWeight : 0;

  const total = Math.round(mustScore + niceScore + fallbackWeight);

  const coveredCount = matches.filter((m) => m.status === "covered").length;
  const partialCount = matches.filter((m) => m.status === "partial").length;
  const gapCount = matches.filter((m) => m.status === "gap").length;

  return {
    score: Math.min(100, Math.max(0, total)),
    totalRequirements: matches.length,
    coveredCount,
    partialCount,
    gapCount,
    matches,
    summary: {
      mustCovered,
      mustTotal: must.length,
      niceCovered,
      niceTotal: nice.length,
    },
  };
}
