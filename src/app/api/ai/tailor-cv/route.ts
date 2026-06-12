import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { claudeGenerate } from "@/lib/claude";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import { parseActiveResume } from "@/lib/resume-server";
import type { ResumeData } from "@/store/useResumeStore";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/tailor-cv
 * Body: { applicationId: string }
 *
 * Skreddersyr aktiv CV mot søknadens stillingsbeskrivelse: AI skriver om
 * profilteksten, sorterer ferdighetene etter relevans og løfter frem
 * relevant ansvar i erfaringsbeskrivelsene. Returnerer { name, resumeData }
 * UTEN server-side persistens — klienten legger den inn i CV-storen
 * (addResumeWithData) og lar aktiv sync-stack (Yjs/cloud) eie skrivingen,
 * akkurat som godkjente collab-forslag.
 */

const TAILOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "summary", "skills", "experience"],
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "description"],
        properties: {
          id: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
} as const;

type TailorResult = {
  name: string;
  summary: string;
  skills: string[];
  experience: { id: string; description: string }[];
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  if (!checkAiRateLimit(session.userId)) {
    return NextResponse.json({ error: AI_RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  let body: { applicationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }
  if (!body.applicationId || typeof body.applicationId !== "string") {
    return NextResponse.json({ error: "Mangler applicationId" }, { status: 400 });
  }

  const [app, userData] = await Promise.all([
    prisma.jobApplication.findFirst({
      where: { id: body.applicationId, userId: session.userId },
      select: { id: true, title: true, companyName: true, jobDescription: true },
    }),
    prisma.userData.findUnique({
      where: { userId: session.userId },
      select: { resumeData: true },
    }),
  ]);

  if (!app) {
    return NextResponse.json({ error: "Søknaden finnes ikke" }, { status: 404 });
  }
  if (!app.jobDescription || app.jobDescription.trim().length < 100) {
    return NextResponse.json(
      { error: "Lim inn stillingsteksten under Forberedelse først, AI-en trenger den for å skreddersy CV-en." },
      { status: 400 },
    );
  }

  const base = parseActiveResume(userData?.resumeData);
  // Persistert payload kan være "{}" (DB-default og etter Nullstill) — da
  // mangler felt-arrayene helt, så normaliser før bruk.
  const baseExperience = Array.isArray(base?.experience) ? base.experience : [];
  const baseEducation = Array.isArray(base?.education) ? base.education : [];
  const baseSkills = Array.isArray(base?.skills) ? base.skills : [];

  if (!base || (!base.summary && baseExperience.length === 0)) {
    return NextResponse.json(
      { error: "CV-en er tom. Fyll inn innhold i Min CV først." },
      { status: 400 },
    );
  }

  const lang = base.locale === "en" ? "engelsk" : "norsk bokmål";
  const system = `Du er en norsk rekrutteringsekspert. Du skreddersyr en eksisterende CV mot én konkret stillingsannonse.
Oppgaver:
1. Skriv om profilteksten (summary) så den treffer stillingens krav, 3-5 setninger.
2. Sorter ferdighetslisten med de mest relevante først. Du kan KUN bruke ferdigheter som allerede finnes i listen, aldri legge til nye. Du kan utelate de minst relevante hvis listen er lang.
3. Skriv om beskrivelsen for de mest relevante erfaringene (referer med id fra input) så relevant ansvar og resultater løftes frem. Ikke ta med erfaringer du ikke endrer.
KRITISK ANTI-HALLUSINASJON: aldri ny erfaring, nye tall, nye titler eller nye ferdigheter — kun omformuler og prioriter det som finnes.
Skriv på ${lang}. Returner også et kort CV-navn på formen "CV - <stillingstittel> hos <selskap>".`;

  const userPrompt = `STILLING:
${app.title} hos ${app.companyName}
${app.jobDescription.slice(0, 6000)}

CV:
${JSON.stringify({
    role: base.role,
    summary: base.summary,
    skills: baseSkills,
    experience: baseExperience.map((e) => ({
      id: e.id,
      title: e.title,
      company: e.company,
      description: e.description.slice(0, 1500),
    })),
    education: baseEducation.map((e) => `${e.degree} ${e.field}, ${e.school}`),
  })}`;

  let raw: string;
  try {
    raw = await claudeGenerate(userPrompt, {
      system,
      maxOutputTokens: 3000,
      jsonSchema: TAILOR_SCHEMA as unknown as Record<string, unknown>,
    });
  } catch (err) {
    console.error("tailor-cv: claudeGenerate feilet", err);
    return NextResponse.json(
      { error: "AI-tilpasningen feilet. Prøv igjen om litt." },
      { status: 502 },
    );
  }

  let result: TailorResult;
  try {
    result = JSON.parse(raw);
  } catch {
    console.error("tailor-cv: ugyldig JSON fra modellen");
    return NextResponse.json(
      { error: "AI-tilpasningen feilet. Prøv igjen om litt." },
      { status: 502 },
    );
  }

  // Merge inn i en dyp kopi av basis-CV-en: kun summary, skills og matchende
  // erfaringsbeskrivelser endres — kontakt, utdanning, design osv. urørt.
  const tailored: ResumeData = JSON.parse(JSON.stringify(base));

  if (result.summary?.trim()) tailored.summary = result.summary.trim();

  // Skills må være subset/omsortering av originalen — dropp hallusinerte.
  const originalSkills = new Map(baseSkills.map((s) => [s.toLowerCase(), s]));
  const reordered = (result.skills ?? [])
    .map((s) => originalSkills.get(s.trim().toLowerCase()))
    .filter((s): s is string => Boolean(s));
  if (reordered.length > 0) {
    const seen = new Set(reordered.map((s) => s.toLowerCase()));
    // Utelatte ferdigheter beholdes bakerst — AI-en prioriterer, sletter ikke.
    tailored.skills = [
      ...reordered,
      ...baseSkills.filter((s) => !seen.has(s.toLowerCase())),
    ];
  }

  for (const patch of result.experience ?? []) {
    const target = baseExperience.length
      ? tailored.experience.find((e) => e.id === patch.id)
      : undefined;
    if (target && patch.description?.trim()) {
      target.description = patch.description.trim();
    }
  }

  const name =
    result.name?.trim() || `CV - ${app.title} hos ${app.companyName}`;

  return NextResponse.json({ name, resumeData: tailored });
}
