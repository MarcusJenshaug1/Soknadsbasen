import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { scoreAtsFromNormalized, buildNormalizedResume } from "@/lib/ats";

import { ERFARING_LABELS, type ErfaringCode } from "./facets";
import { extractJobKeywords } from "./format";
import { normalizeResumeData } from "./match";

export type MatchFactor = {
  label: string;
  /** 0–100 — driver bredden på indikator-baren. */
  value: number;
  /** Tekstlig vurdering (retning aldri kun via farge/bredde). */
  word: "Sterk" | "Delvis" | "Svak";
  /** Kort forklaring på hva som trakk opp/ned. */
  detail: string;
};

export type MatchBreakdown = {
  score: number;
  factors: MatchFactor[];
};

const word = (v: number): MatchFactor["word"] =>
  v >= 70 ? "Sterk" : v >= 40 ? "Delvis" : "Svak";

/**
 * Match-breakdown for detaljsiden: faktorer beregnet REELT fra CV-en mot
 * annonsens krav — kun dimensjoner vi faktisk har data for (ferdigheter,
 * erfaring, utdanning, språk). Geografi/omfang utelates bevisst: vi kjenner
 * ikke brukerens bosted eller ønsket stillingsprosent, og en oppdiktet faktor
 * er verre enn en utelatt. cache(): quick view + full side deler beregningen.
 */
export const computeMatchBreakdown = cache(
  async (userId: string, jobId: string): Promise<MatchBreakdown | null> => {
    const [userData, job] = await Promise.all([
      prisma.userData.findUnique({
        where: { userId },
        select: { resumeData: true },
      }),
      prisma.job.findUnique({
        where: { id: jobId },
        select: {
          category: true,
          occupation: true,
          categoryList: true,
          occupationList: true,
          aiKeywords: true,
          aiEducation: true,
          aiExperience: true,
          aiWorkLanguages: true,
        },
      }),
    ]);
    if (!userData || !job) return null;
    const resume = normalizeResumeData(userData.resumeData);
    if (!resume) return null;

    const normalized = buildNormalizedResume(resume);
    const keywords = extractJobKeywords(job);
    if (keywords.length === 0) return null;

    const score = scoreAtsFromNormalized(normalized, keywords);
    const factors: MatchFactor[] = [skillsFactor(normalized.text, keywords)];

    const erfaring = experienceFactor(resume.experience.length, job.aiExperience);
    if (erfaring) factors.push(erfaring);

    const utdanning = educationFactor(resume, job.aiEducation);
    if (utdanning) factors.push(utdanning);

    const sprak = languageFactor(normalized.text, job.aiWorkLanguages);
    if (sprak) factors.push(sprak);

    return { score, factors };
  },
);

function normalizeTerm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function skillsFactor(resumeText: string, keywords: string[]): MatchFactor {
  const matched = keywords.filter((k) => resumeText.includes(normalizeTerm(k)));
  const missing = keywords.filter((k) => !resumeText.includes(normalizeTerm(k)));
  const value = Math.round((matched.length / keywords.length) * 100);
  return {
    label: "Ferdigheter",
    value,
    word: word(value),
    detail:
      missing.length > 0
        ? `Dekker ${matched.length} av ${keywords.length} nøkkelord. Mangler bl.a. ${missing
            .slice(0, 3)
            .join(", ")}.`
        : `Dekker alle ${keywords.length} nøkkelordene fra annonsen.`,
  };
}

/** Grov år-ekvivalent: hver CV-erfaring telles som ~1,5 år. */
function experienceFactor(
  experienceCount: number,
  required: string | null,
): MatchFactor | null {
  if (!required) return null;
  const approxYears = experienceCount * 1.5;
  const needed: Record<ErfaringCode, number> = { ingen: 0, noe: 1, mye: 4 };
  const req = needed[required as ErfaringCode] ?? 0;
  const value =
    req === 0 ? 100 : Math.round(Math.min(1, approxYears / (req + 1)) * 100);
  const label = ERFARING_LABELS[required as ErfaringCode] ?? required;
  return {
    label: "Erfaring",
    value,
    word: word(value),
    detail:
      req === 0
        ? "Annonsen stiller ikke erfaringskrav."
        : `Annonsen ber om ${label.toLocaleLowerCase("nb-NO")}; CV-en din har ${experienceCount} erfaring${experienceCount === 1 ? "" : "er"}.`,
  };
}

const EDU_RANK: Record<string, number> = {
  "ingen-krav": 0,
  videregaende: 1,
  fagbrev: 2,
  fagskole: 3,
  bachelor: 4,
  master: 5,
};

const EDU_HINTS: Record<string, RegExp> = {
  videregaende: /videreg|vgs/,
  fagbrev: /fagbrev|svennebrev/,
  fagskole: /fagskole/,
  bachelor: /bachelor|høgskole|hogskole|universitet|b\.?sc/,
  master: /master|sivil(økonom|ingeniør)|m\.?sc|ph\.?d/,
};

function educationFactor(
  resume: { education: { degree?: string; field?: string; school?: string }[] },
  required: string[],
): MatchFactor | null {
  const reqs = required.filter((r) => r !== "ingen-krav");
  if (reqs.length === 0) return null;

  const eduText = normalizeTerm(
    resume.education.map((e) => [e.degree, e.field, e.school].join(" ")).join(" "),
  );
  let cvRank = resume.education.length > 0 ? 1 : 0;
  for (const [code, re] of Object.entries(EDU_HINTS)) {
    if (re.test(eduText)) cvRank = Math.max(cvRank, EDU_RANK[code]);
  }
  // Laveste aksepterte nivå i annonsen («bachelor eller fagbrev»).
  const reqRank = Math.min(...reqs.map((r) => EDU_RANK[r] ?? 1));
  const value = reqRank === 0 ? 100 : Math.round(Math.min(1, cvRank / reqRank) * 100);
  return {
    label: "Utdanning",
    value,
    word: word(value),
    detail:
      value >= 100
        ? "Utdanningen i CV-en dekker kravet i annonsen."
        : "Annonsens utdanningskrav ser ut til å ligge over det CV-en viser.",
  };
}

const LANG_HINTS: Record<string, RegExp> = {
  norsk: /norsk/,
  engelsk: /engelsk|english/,
  skandinavisk: /norsk|svensk|dansk|skandinav/,
  samisk: /samisk/,
};

function languageFactor(resumeText: string, required: string[]): MatchFactor | null {
  if (required.length === 0) return null;
  const covered = required.filter((lang) => LANG_HINTS[lang]?.test(resumeText));
  // Norsk antas dekket når CV-en er skrevet på norsk men ikke nevner språk.
  const effective = new Set(covered);
  if (required.includes("norsk") && !effective.has("norsk")) effective.add("norsk");
  const value = Math.round((effective.size / required.length) * 100);
  const missing = required.filter((l) => !effective.has(l));
  return {
    label: "Språk",
    value,
    word: word(value),
    detail:
      missing.length === 0
        ? "Språkkravene ser dekket ut."
        : `Annonsen ber om ${required.join(", ")}; nevn ${missing.join(", ")} i CV-en hvis du behersker det.`,
  };
}
