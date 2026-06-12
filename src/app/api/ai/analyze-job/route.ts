import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { consumeAiCredit, refundAiCredit, recordAiUsageEvent } from "@/lib/ai/credits";
import { quotaErrorResponse } from "@/lib/ai/quota-response";
import { prisma } from "@/lib/prisma";
import { claudeGenerate } from "@/lib/claude";
import { parseLooseJson } from "@/lib/json";

/**
 * POST /api/ai/analyze-job
 * Body: { applicationId: string }
 * Returns: {
 *   mustHave: string[], niceToHave: string[], responsibilities: string[],
 *   redFlags: string[], tone: string, summary: string
 * }
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  if (!checkAiRateLimit(session.userId)) return NextResponse.json({ error: AI_RATE_LIMIT_MESSAGE }, { status: 429 });

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

  const system = `Du analyserer stillingsannonser for en jobbsøker-plattform. Returner GYLDIG JSON etter skjemaet. Ikke finn på krav som ikke er i teksten.

SCHEMA:
{
  "mustHave": ["konkret krav som er eksplisitt nevnt"],
  "niceToHave": ["ønskelig, ikke pålagt"],
  "responsibilities": ["hovedoppgaver i rollen"],
  "redFlags": ["urimelige krav / vage formuleringer / advarsler"],
  "tone": "formell | moderat | uformell",
  "summary": "2-3 setninger oppsummering av hva rollen faktisk er"
}

Regler:
- Maks 8 punkter i hver liste. Hold dem korte (maks 10 ord per punkt).
- mustHave = kategoriske krav ("må ha", "krever", "nødvendig", "krav:").
- niceToHave = ønskelig ("fordel", "pluss", "bonus", "gjerne").
- redFlags KUN hvis tydelig — ellers returner tom array.
- Returner KUN JSON. Ingen code fence, ingen forklaring.`;

  const userPrompt = `Stilling: ${app.title}\nSelskap: ${app.companyName}\n\n=== STILLINGSTEKST ===\n${app.jobDescription}\n=== SLUTT ===`;

  const credit = await consumeAiCredit(session.userId, "analyze_job");
  if (!credit.ok) return quotaErrorResponse(credit);

  try {
    const raw = await claudeGenerate(userPrompt, {
      system,
      temperature: 0.2,
      maxOutputTokens: 1500,
      json: true,
      onUsage: (u) => void recordAiUsageEvent(session.userId, "analyze_job", u.model, u),
    });
    const parsed = parseLooseJson(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    await refundAiCredit(session.userId, credit.source, credit.periodStart);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
