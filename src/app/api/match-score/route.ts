import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";
import { computeMatchScore, type AnalyzeJobResult } from "@/lib/match-score";
import type { ResumeData } from "@/store/useResumeStore";

const ANALYZE_SYSTEM = `Du analyserer stillingsannonser. Returner GYLDIG JSON.

SCHEMA:
{
  "mustHave": ["konkret krav som er eksplisitt nevnt"],
  "niceToHave": ["onskelig, ikke palagt"],
  "responsibilities": ["hovedoppgaver"],
  "redFlags": [],
  "tone": "formell | moderat | uformell",
  "summary": ""
}

Maks 8 punkter per liste, maks 10 ord per punkt. Returner KUN JSON.`;

function pickResumeData(raw: string | null | undefined): ResumeData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      activeResumeId?: string;
      _resumeDataMap?: Record<string, ResumeData>;
      data?: ResumeData;
    } & ResumeData;
    return (
      (parsed?._resumeDataMap &&
        parsed.activeResumeId &&
        parsed._resumeDataMap[parsed.activeResumeId]) ||
      parsed?.data ||
      (parsed as ResumeData)
    );
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const body = (await req.json()) as { applicationId?: string };
  if (!body.applicationId) {
    return NextResponse.json(
      { error: "applicationId er påkrevd" },
      { status: 400 },
    );
  }

  const app = await prisma.jobApplication.findFirst({
    where: { id: body.applicationId, userId: session.userId },
    select: { title: true, companyName: true, jobDescription: true },
  });
  if (!app) {
    return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });
  }
  if (!app.jobDescription?.trim()) {
    return NextResponse.json(
      { error: "Mangler stillingsbeskrivelse. Lim inn teksten først." },
      { status: 400 },
    );
  }

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });
  const resume = pickResumeData(userData?.resumeData ?? null);
  if (!resume) {
    return NextResponse.json(
      { error: "Ingen CV funnet. Opprett CV først." },
      { status: 400 },
    );
  }

  let analysis: AnalyzeJobResult;
  try {
    const raw = await geminiGenerate(
      `Stilling: ${app.title}\nSelskap: ${app.companyName}\n\nStillingstekst:\n${app.jobDescription}`,
      {
        system: ANALYZE_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 1500,
        json: true,
      },
    );
    analysis = parseLooseJson(raw) as AnalyzeJobResult;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil ved analyse" },
      { status: 502 },
    );
  }

  const result = computeMatchScore(analysis, resume);
  return NextResponse.json(result);
}
