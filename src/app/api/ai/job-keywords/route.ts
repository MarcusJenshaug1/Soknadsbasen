import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";

/**
 * POST /api/ai/job-keywords
 * Body: { slug: string }
 * Returns: { keywords: string[], cached: boolean }
 *
 * Henter (eller computer + cacher) ATS-relevante nøkkelord for en stilling.
 * Krever innlogget bruker. Cache lever for evig — annonser endres sjelden
 * og NAV emit nytt event hvis de blir oppdatert.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as { slug?: string };
  if (!body.slug) {
    return NextResponse.json({ error: "slug er påkrevd" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { slug: body.slug },
    select: {
      id: true,
      title: true,
      employerName: true,
      description: true,
      category: true,
      occupation: true,
      aiKeywords: true,
    },
  });
  if (!job) return NextResponse.json({ error: "Stilling ikke funnet" }, { status: 404 });

  if (job.aiKeywords.length > 0) {
    return NextResponse.json({ keywords: job.aiKeywords, cached: true });
  }

  if (!job.description?.trim()) {
    return NextResponse.json({ keywords: [], cached: false });
  }

  const system = `Du er en ATS-spesialist. Trekk ut nøkkelord fra stillingsteksten som rekrutteringssystemer (ATS) og rekrutterer faktisk søker etter. Returner GYLDIG JSON.

SCHEMA:
{ "keywords": ["string", ...] }

REGLER:
- Maks 20 nøkkelord, sortert etter viktighet (viktigst først).
- INKLUDER: yrkestitler/roller (sykepleier, frontend-utvikler, vekter), tekniske ferdigheter (React, SQL, Excel, AutoCAD), verktøy/plattformer (Salesforce, SAP, Figma), domener (B2B, e-handel, prosjektledelse), sertifiseringer (PRINCE2, autorisasjon), språk-krav, soft skills nevnt eksplisitt (ledelse, kommunikasjon, analytisk).
- EKSKLUDER: stedsnavn (Oslo, Skien), datoer/måneder (april), ord som beskriver annonsen selv (publisert, arbeidssted), generiske ord (jobb, rolle, kandidat), bedriftens navn.
- Bruk korte termer (1-3 ord). Lowercase med mindre egennavn (React, SAP, B2B).
- Returner KUN JSON. Ingen markdown, ingen forklaring.`;

  const userPrompt = `Stilling: ${job.title}\nSelskap: ${job.employerName}\n${job.category ? `Kategori: ${job.category}\n` : ""}\n=== STILLINGSTEKST ===\n${job.description.replace(/<[^>]+>/g, " ").slice(0, 6000)}\n=== SLUTT ===`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.1,
      maxOutputTokens: 800,
      json: true,
    });
    const parsed = parseLooseJson(raw) as { keywords?: unknown };
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim())
          .slice(0, 20)
      : [];

    if (keywords.length > 0) {
      await prisma.job.update({
        where: { id: job.id },
        data: { aiKeywords: keywords, aiKeywordsAt: new Date() },
      });
    }

    return NextResponse.json({ keywords, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
