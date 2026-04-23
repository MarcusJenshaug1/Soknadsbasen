import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";

/**
 * POST /api/ai/cover-letter
 * Body: { applicationId: string, tone?: "formell" | "varm" | "konsis" }
 * Returns: { body: string } — HTML paragraphs for the Lexical editor.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const body = (await req.json()) as {
    applicationId?: string;
    tone?: "formell" | "varm" | "konsis";
  };
  if (!body.applicationId) {
    return NextResponse.json({ error: "applicationId er påkrevd" }, { status: 400 });
  }

  const app = await prisma.jobApplication.findFirst({
    where: { id: body.applicationId, userId: session.userId },
    select: {
      companyName: true,
      title: true,
      jobDescription: true,
      notes: true,
    },
  });
  if (!app) {
    return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });
  }

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });

  let resumeSummary = "";
  try {
    const parsed = JSON.parse(userData?.resumeData ?? "{}");
    const contact = parsed.contact ?? {};
    const experience: { title?: string; company?: string; description?: string }[] =
      parsed.experience ?? [];
    const skills: { name?: string }[] = parsed.skills ?? [];
    resumeSummary = [
      parsed.role ? `Ønsket rolle: ${parsed.role}` : "",
      contact.firstName || contact.lastName
        ? `Navn: ${[contact.firstName, contact.lastName].filter(Boolean).join(" ")}`
        : "",
      parsed.summary ? `Profil: ${parsed.summary}` : "",
      experience.length
        ? `Erfaring: ${experience
            .slice(0, 4)
            .map(
              (e) =>
                `${e.title ?? ""} hos ${e.company ?? ""}${
                  e.description ? ` – ${String(e.description).slice(0, 200)}` : ""
                }`,
            )
            .join("; ")}`
        : "",
      skills.length
        ? `Ferdigheter: ${skills
            .slice(0, 10)
            .map((s) => s.name)
            .filter(Boolean)
            .join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    // CV parsing failure is non-fatal; proceed without resume context.
  }

  const tone = body.tone ?? "varm";
  const toneHint: Record<string, string> = {
    formell: "Profesjonell og nøktern tone. Unngå slang.",
    varm: "Varm, personlig, men profesjonell.",
    konsis: "Kort og rett på sak. Maks tre korte avsnitt.",
  };

  const system = `Du skriver søknadsbrev på norsk bokmål for en jobbsøker-plattform.
Tone: ${toneHint[tone]}
Format: 3-4 avsnitt. Bruk HTML <p>-tagger mellom avsnitt. Ingen overskrifter, ingen signatur, ingen hilsen — bare brødteksten.
Regler:
- Bruk kun informasjon fra jobbeskrivelsen og kandidatens CV. Ikke finn opp erfaring.
- Åpne med hvorfor nettopp denne rollen og selskapet appellerer.
- Midtdelen: 2-3 konkrete koblinger mellom jobbkrav og kandidatens erfaring.
- Avslutt med en tydelig, nøktern motivasjon og invitasjon til samtale.
- Ingen klisjéer som "dynamisk" eller "lidenskapelig".`;

  const userPrompt = `STILLING
Tittel: ${app.title}
Selskap: ${app.companyName}
${app.jobDescription ? `\nStillingsbeskrivelse:\n${app.jobDescription}` : ""}
${app.notes ? `\nEgne notater:\n${app.notes}` : ""}

KANDIDAT
${resumeSummary || "Ingen CV-data tilgjengelig. Skriv generelt."}

Skriv kun brødteksten, som HTML-formaterte avsnitt.`;

  try {
    const text = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.8,
      maxOutputTokens: 1200,
    });

    // Normalise: strip code fences, ensure paragraph tags.
    let clean = text
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    if (!/<p[\s>]/i.test(clean)) {
      clean = clean
        .split(/\n{2,}/)
        .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
        .join("");
    }

    return NextResponse.json({ body: clean });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
