import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";
import { parseActiveResume } from "@/lib/resume-server";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as { applicationId?: string };
  if (!body.applicationId) {
    return NextResponse.json({ error: "applicationId er påkrevd" }, { status: 400 });
  }

  const [app, userData] = await Promise.all([
    prisma.jobApplication.findFirst({
      where: { id: body.applicationId, userId: session.userId },
      select: { title: true, companyName: true, jobDescription: true },
    }),
    prisma.userData.findUnique({
      where: { userId: session.userId },
      select: { resumeData: true },
    }),
  ]);

  if (!app) return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });
  if (!app.jobDescription?.trim()) {
    return NextResponse.json(
      { error: "Ingen stillingstekst lagt inn. Lim inn stillingsteksten først." },
      { status: 400 },
    );
  }

  const cv = parseActiveResume(userData?.resumeData);
  if (!cv) {
    return NextResponse.json(
      { error: "Ingen CV-data funnet. Fyll ut CV-en din først." },
      { status: 400 },
    );
  }

  const cvSummary = [
    cv.role ? `Ønsket rolle: ${cv.role}` : "",
    cv.summary ? `Profil: ${String(cv.summary).slice(0, 500)}` : "",
    Array.isArray(cv.experience) && cv.experience.length
      ? `Erfaring:\n${cv.experience
          .slice(0, 5)
          .map((e) => `- ${e.title} hos ${e.company}${e.description ? `: ${String(e.description).slice(0, 120)}` : ""}`)
          .join("\n")}`
      : "",
    Array.isArray(cv.education) && cv.education.length
      ? `Utdanning: ${cv.education.map((e) => `${e.degree}${e.field ? ` i ${e.field}` : ""} ved ${e.school}`).join(", ")}`
      : "",
    Array.isArray(cv.skills) && cv.skills.length
      ? `Ferdigheter: ${cv.skills.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const system = `Du er en rekrutteringsspesialist. Sammenlikn kandidatens CV med stillingsteksten og returner GYLDIG JSON etter skjemaet nedenfor.

SCHEMA:
{
  "score": 0-100,
  "label": "Sterk match" | "God match" | "Delvis match" | "Svak match",
  "styrker": ["konkret punkt som matcher, maks 10 ord"],
  "mangler": ["konkret gap, maks 10 ord"],
  "anbefalinger": ["kort råd for å styrke søknaden, maks 12 ord"]
}

Regler:
- score 80-100: kandidaten møter de fleste krav
- score 60-79: god bakgrunn men noen hull
- score 40-59: delvis match, tydelige gap
- under 40: svak match
- Maks 4 punkter i styrker, mangler og anbefalinger.
- Basert KUN på informasjonen gitt, ikke anta noe.
- Returner KUN JSON. Ingen markdown, ingen forklaring.`;

  const userPrompt = `STILLING\nTittel: ${app.title}\nSelskap: ${app.companyName}\n\nStillingstekst:\n${app.jobDescription.slice(0, 4000)}\n\n---\n\nKANDIDAT\n${cvSummary}`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.2,
      maxOutputTokens: 1000,
      json: true,
    });
    const parsed = parseLooseJson(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
