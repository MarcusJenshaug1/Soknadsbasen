import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { claudeGenerate } from "@/lib/claude";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import { parseActiveResume, parseResumeById } from "@/lib/resume-server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/cv-review
 * Body: { resumeId?: string }
 *
 * AI CV-hjelperen: går gjennom hele CV-en og returnerer felt-nivå-forslag
 * (samme fieldPath-grammatikk som collab-forslag) som klienten viser i
 * forslagskort og anvender via applyResumeSuggestion ved godkjenning.
 * Forslagene persisteres ikke — én ny gjennomgang er ett rate-limitet kall.
 */

const FIELD_PATH_RE =
  /^(role|summary|skills|interests|(?:experience|education)\.id:[^.]+\.description)$/;

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fieldPath", "currentValue", "suggestedValue", "reason"],
        properties: {
          fieldPath: { type: "string" },
          currentValue: { type: "string" },
          suggestedValue: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

type RawSuggestion = {
  fieldPath: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
};

const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)} …` : s);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  if (!checkAiRateLimit(session.userId)) {
    return NextResponse.json({ error: AI_RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  let body: { resumeId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });
  const resume = body.resumeId
    ? parseResumeById(userData?.resumeData, body.resumeId)
    : parseActiveResume(userData?.resumeData);

  if (!resume || (!resume.summary && resume.experience.length === 0)) {
    return NextResponse.json(
      { error: "CV-en er tom. Fyll inn innhold før AI-gjennomgangen." },
      { status: 400 },
    );
  }

  const lang = resume.locale === "en" ? "engelsk" : "norsk bokmål";
  const system = `Du er en erfaren norsk CV-coach. Du gjennomgår en komplett CV og foreslår konkrete forbedringer per felt.
KRITISK ANTI-HALLUSINASJON: aldri finn på arbeidsgivere, titler, tall, datoer eller ferdigheter som ikke finnes i CV-en. Kun omformuler, konkretiser og stram opp det som faktisk står der. Foreslå gjerne å fjerne svake/utdaterte elementer ved å utelate dem fra en listeverdi.
Skriv forslagsverdiene og begrunnelsene på ${lang}.
Maks 10 forslag, prioriter de viktigste. Ikke foreslå endringer i felt som allerede er gode.
fieldPath må være en av: "role", "summary", "skills", "interests", "experience.id:<id>.description", "education.id:<id>.description" — bruk id-ene oppgitt i input.
currentValue må være en eksakt kopi av dagens verdi. For skills/interests er verdiene hele listen som kommaseparert streng.
reason er én kort setning om hvorfor endringen er bedre.`;

  const input = {
    role: resume.role,
    summary: resume.summary,
    skills: resume.skills.join(", "),
    interests: resume.interests.join(", "),
    experience: resume.experience.map((e) => ({
      id: e.id,
      title: e.title,
      company: e.company,
      startDate: e.startDate,
      endDate: e.current ? "nå" : e.endDate,
      description: cap(e.description, 1500),
    })),
    education: resume.education.map((e) => ({
      id: e.id,
      degree: e.degree,
      field: e.field,
      school: e.school,
      description: cap(e.description, 800),
    })),
  };

  let raw: string;
  try {
    raw = await claudeGenerate(JSON.stringify(input), {
      system,
      maxOutputTokens: 4000,
      jsonSchema: REVIEW_SCHEMA as unknown as Record<string, unknown>,
    });
  } catch (err) {
    console.error("cv-review: claudeGenerate feilet", err);
    return NextResponse.json(
      { error: "AI-gjennomgangen feilet. Prøv igjen om litt." },
      { status: 502 },
    );
  }

  let parsed: { suggestions: RawSuggestion[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("cv-review: ugyldig JSON fra modellen");
    return NextResponse.json(
      { error: "AI-gjennomgangen feilet. Prøv igjen om litt." },
      { status: 502 },
    );
  }

  const knownIds = new Set([
    ...resume.experience.map((e) => `experience.id:${e.id}.description`),
    ...resume.education.map((e) => `education.id:${e.id}.description`),
  ]);

  // Post-validering: dropp forslag mot ukjente felt/id-er og tomme verdier,
  // så klienten aldri får et forslag som ikke kan anvendes.
  const suggestions = parsed.suggestions
    .filter(
      (s) =>
        FIELD_PATH_RE.test(s.fieldPath) &&
        s.suggestedValue.trim().length > 0 &&
        (!s.fieldPath.includes(".id:") || knownIds.has(s.fieldPath)),
    )
    .slice(0, 10)
    .map((s, i) => ({ id: `ai-${i}`, ...s }));

  return NextResponse.json({ suggestions });
}
