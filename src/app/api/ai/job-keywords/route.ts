import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";
import { extractJobKeywords } from "@/lib/jobs/format";

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
      categoryList: true,
      occupationList: true,
      aiKeywords: true,
    },
  });
  if (!job) return NextResponse.json({ error: "Stilling ikke funnet" }, { status: 404 });

  // Re-generer hvis cached array er mistenkelig kort (< 5) og vi nå har
  // skikkelig description-tekst. Det skjer når AI ble kjørt før backfill
  // av description, eller med dårlig tekst.
  const descLen = job.description?.replace(/<[^>]+>/g, " ").trim().length ?? 0;
  const cacheTooSmall = job.aiKeywords.length > 0 && job.aiKeywords.length < 5 && descLen > 500;

  if (job.aiKeywords.length >= 5) {
    return NextResponse.json({ keywords: job.aiKeywords, cached: true });
  }

  if (!job.description?.trim() && !cacheTooSmall) {
    return NextResponse.json({ keywords: [], cached: false });
  }

  const navKeywords = extractJobKeywords({
    category: job.category,
    occupation: job.occupation,
    categoryList: job.categoryList,
    occupationList: job.occupationList,
  });

  const system = `Du er en ATS-spesialist. Generer en UTFYLLENDE liste ATS-nøkkelord som rekrutteringssystemer matcher mot. Bedre å ha flere relevante enn for få. Returner GYLDIG JSON.

SCHEMA:
{ "keywords": ["string", ...] }

REGLER:
- 15-25 nøkkelord, sortert etter viktighet (viktigst først).
- BEHOLD ALLE NAV-klassifiserte termer (gitt under) — de er kanonisk yrkesvokabular.
- LEGG TIL fra stillingsteksten:
  • Synonymer/varianter av jobbtittel
  • Tekniske ferdigheter (React, SQL, TypeScript, Excel, AutoCAD)
  • Verktøy/plattformer (Salesforce, SAP, Figma, Azure)
  • Konsepter/metoder (CI/CD, agile, prosjektledelse, ISR)
  • Domener/bransjer
  • Sertifiseringer (autorisasjon, vekterkort, førerkort)
  • Språk-krav (engelsk, norsk)
  • Soft skills KONKRET nevnt (ledelse, kommunikasjon, analytisk)
- EKSKLUDER: stedsnavn (Oslo, Skien), datoer (april), annonse-metadata (publisert, arbeidssted), generiske ord (jobb, rolle, kandidat), bedriftsnavn.
- Korte termer (1-3 ord). Lowercase med mindre egennavn (React, SAP, B2B, TypeScript).
- Returner KUN JSON. Ingen markdown, ingen forklaring.`;

  const userPrompt = [
    `Stilling: ${job.title}`,
    `Selskap: ${job.employerName}`,
    job.category ? `Hovedkategori: ${job.category}` : "",
    navKeywords.length > 0
      ? `NAV-klassifisering (BEHOLD disse i output): ${navKeywords.join(", ")}`
      : "",
    "",
    "=== STILLINGSTEKST ===",
    job.description.replace(/<[^>]+>/g, " ").slice(0, 6000),
    "=== SLUTT ===",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.1,
      maxOutputTokens: 800,
      json: true,
    });
    const parsed = parseLooseJson(raw) as { keywords?: unknown };
    const aiOnly = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim())
      : [];

    // Merge AI + NAV-klassifisering (dedup case-insensitive). NAV-termer er
    // alltid med — de er kanonisk taksonomi.
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const kw of [...aiOnly, ...navKeywords]) {
      const key = kw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(kw);
    }
    const keywords = merged.slice(0, 30);

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
