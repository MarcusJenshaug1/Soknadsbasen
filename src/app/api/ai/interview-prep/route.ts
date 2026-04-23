import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";

/**
 * POST /api/ai/interview-prep
 * Body: { applicationId: string }
 * Returns: { questions: { category: string; question: string; tip: string }[] }
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as { applicationId?: string };
  if (!body.applicationId) {
    return NextResponse.json({ error: "applicationId er påkrevd" }, { status: 400 });
  }

  const app = await prisma.jobApplication.findFirst({
    where: { id: body.applicationId, userId: session.userId },
    select: { title: true, companyName: true, jobDescription: true, notes: true },
  });
  if (!app) return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });

  let resumeSummary = "";
  try {
    const data = JSON.parse(userData?.resumeData ?? "{}");
    resumeSummary = [
      data.role ? `Ønsket rolle: ${data.role}` : "",
      data.summary ? `Profil: ${String(data.summary).slice(0, 400)}` : "",
      Array.isArray(data.experience) && data.experience.length
        ? `Erfaring: ${data.experience
            .slice(0, 4)
            .map((e: { title?: string; company?: string }) => `${e.title} hos ${e.company}`)
            .join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {}

  const system = `Du genererer intervjuforberedelse på norsk bokmål for en jobbsøker. Returner GYLDIG JSON med 8-10 typiske spørsmål fordelt på kategoriene "Om deg", "Rollen", "Teknisk", "Scenario", "Om selskapet".

SCHEMA:
{
  "questions": [
    { "category": "...", "question": "...", "tip": "kort råd om hva intervjuer ser etter (1 setning)" }
  ]
}

Regler:
- Baser spørsmålene på stillingsteksten når tilgjengelig.
- Tekniske spørsmål: kun hvis teknologier nevnes i stillingen.
- "Scenario" = "fortell om en gang du …"-spørsmål tilpasset kravene.
- Tips skal være nøkterne, ikke oppskriftsmessige.
- Returner KUN JSON. Ingen markdown, ingen code fence.`;

  const userPrompt = `STILLING\nTittel: ${app.title}\nSelskap: ${app.companyName}\n${
    app.jobDescription ? `\nStillingstekst:\n${app.jobDescription}` : ""
  }${app.notes ? `\n\nKandidatens notater:\n${app.notes}` : ""}\n\nKANDIDAT\n${
    resumeSummary || "(Ingen CV-data)"
  }`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.6,
      maxOutputTokens: 2000,
    });
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
