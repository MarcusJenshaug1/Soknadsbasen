import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { ERFARING_LABELS, type ErfaringCode } from "./facets";
import {
  buildCvMatchText,
  normalizeResumeData,
  toJobMatchSide,
} from "./match";
import {
  normalizeMatchText,
  scoreJobMatch,
  termMatches,
} from "./match-scoring";

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
 * Match-breakdown for detaljsiden: hovedscore fra scoreJobMatch (samme som
 * precompute — kort og detaljside viser ALDRI ulike tall) + faktorer beregnet
 * reelt fra CV mot annonsens krav. Geografi/omfang utelates bevisst: vi
 * kjenner ikke brukerens bosted eller ønsket stillingsprosent.
 * cache(): quick view + full side deler beregningen.
 */
export const computeMatchBreakdown = cache(
  async (userId: string, jobId: string): Promise<MatchBreakdown | null> => {
    const [userData, job] = await Promise.all([
      prisma.userData.findUnique({
        where: { userId },
        select: { resumeData: true, aiKeywords: true },
      }),
      prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          jobTitle: true,
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

    const side = toJobMatchSide(job);
    if (side.keywords.length === 0) return null;

    const cvText = buildCvMatchText(resume);
    const score = scoreJobMatch(
      {
        text: cvText,
        role: normalizeMatchText(resume.role),
        cvKeywords: userData.aiKeywords,
      },
      side,
    );

    const factors: MatchFactor[] = [
      skillsFactor(cvText, side.keywords),
      affinityFactor(
        resume.role,
        userData.aiKeywords,
        normalizeMatchText([side.title, ...side.occupationTerms].join(" ")),
      ),
    ];

    const erfaring = experienceFactor(resume.experience.length, job.aiExperience);
    if (erfaring) factors.push(erfaring);

    const utdanning = educationFactor(resume, job.aiEducation);
    if (utdanning) factors.push(utdanning);

    const sprak = languageFactor(cvText, job.aiWorkLanguages);
    if (sprak) factors.push(sprak);

    return { score, factors };
  },
);

function skillsFactor(cvText: string, keywords: string[]): MatchFactor {
  const matched = keywords.filter((k) => termMatches(cvText, k));
  const missing = keywords.filter((k) => !termMatches(cvText, k));
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

/** Motsatt retning: CV-ens yrkestermer søkt i jobbens yrkesside. */
function affinityFactor(
  role: string,
  cvKeywords: string[],
  jobOccText: string,
): MatchFactor {
  const terms = [role, ...cvKeywords].map((t) => t.trim()).filter(Boolean).slice(0, 15);
  const hits = terms.filter((t) => termMatches(jobOccText, t));
  const value = terms.length > 0 ? Math.round((hits.length / terms.length) * 100) : 0;
  return {
    label: "Yrkesretning",
    value,
    word: word(value),
    detail:
      value >= 40
        ? `Profilen din (${hits.slice(0, 2).join(", ")}) treffer stillingens yrkesfelt.`
        : "Stillingen ligger utenfor yrkesfeltet CV-en din peker mot.",
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
  bachelor: /bachelor|hogskole|universitet|b\.?sc/,
  master: /master|sivil(okonom|ingenior)|m\.?sc|ph\.?d/,
};

function educationFactor(
  resume: { education: { degree?: string; field?: string; school?: string }[] },
  required: string[],
): MatchFactor | null {
  const reqs = required.filter((r) => r !== "ingen-krav");
  if (reqs.length === 0) return null;

  const eduText = normalizeMatchText(
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

function languageFactor(cvText: string, required: string[]): MatchFactor | null {
  if (required.length === 0) return null;
  const covered = required.filter((lang) => LANG_HINTS[lang]?.test(cvText));
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
