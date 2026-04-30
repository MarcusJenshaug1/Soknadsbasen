import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";

/**
 * POST /api/ai/ats-keywords
 * Body: { applicationId: string }
 * Returns: { keywords: string[], suggestedRole: string | null }
 *
 * Trekker ut ekte ATS-relevante nøkkelord (tekniske ferdigheter, soft skills,
 * verktøy, sertifiseringer, eksplisitte krav). Filtrerer bort metadata som
 * "Publisert", "Arbeidssted", stedsnavn, datoer, og andre annonse-overskrifter.
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
    select: { title: true, companyName: true, jobDescription: true },
  });
  if (!app) return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });
  if (!app.jobDescription?.trim()) {
    return NextResponse.json(
      { error: "Ingen jobbeskrivelse lagt inn. Lim inn stillingsteksten først." },
      { status: 400 },
    );
  }

  const system = `Du er en ATS-spesialist. Trekk ut nøkkelord fra stillingsteksten som rekrutteringssystemer (ATS) og rekrutterer faktisk søker etter. Returner GYLDIG JSON.

SCHEMA:
{
  "keywords": ["string", ...],
  "suggestedRole": "string | null"
}

REGLER:
- Maks 16 nøkkelord, sortert etter viktighet (viktigst først).
- INKLUDER: tekniske ferdigheter (React, SQL, Excel, AutoCAD), verktøy/plattformer (Salesforce, SAP, Figma), domener (B2B, e-handel, prosjektledelse), sertifiseringer (PRINCE2, autorisasjon), språk-krav, soft skills nevnt eksplisitt (ledelse, kommunikasjon, analytisk).
- EKSKLUDER: stedsnavn (Oslo, Skien, Bergen), datoer/måneder (april, 2026), ord som beskriver annonsen selv (publisert, arbeidssted, beskrivelse, søknadsfrist, stillingen, sammendraget, henter), generiske ord (jobb, rolle, kandidat, vi, du), bedriftens navn.
- Bruk korte termer (1-3 ord). Lowercase med mindre det er et egennavn (React, SAP, B2B).
- suggestedRole: hva er stillingstittelen i klartekst (f.eks. "frontend-utvikler"), eller null hvis uklart.
- Returner KUN JSON. Ingen markdown, ingen forklaring.`;

  const userPrompt = `Stilling: ${app.title}\nSelskap: ${app.companyName}\n\n=== STILLINGSTEKST ===\n${app.jobDescription.slice(0, 6000)}\n=== SLUTT ===`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.1,
      maxOutputTokens: 800,
      json: true,
    });
    const parsed = parseLooseJson(raw) as {
      keywords?: unknown;
      suggestedRole?: unknown;
    };
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim())
          .slice(0, 16)
      : [];
    const suggestedRole =
      typeof parsed.suggestedRole === "string" && parsed.suggestedRole.trim()
        ? parsed.suggestedRole.trim()
        : null;
    return NextResponse.json({ keywords, suggestedRole });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
