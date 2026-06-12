import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { consumeAiCredit, refundAiCredit, recordAiUsageEvent } from "@/lib/ai/credits";
import { quotaErrorResponse } from "@/lib/ai/quota-response";
import { prisma } from "@/lib/prisma";
import { claudeGenerate } from "@/lib/claude";
import { parseLooseJson } from "@/lib/json";
import { parseActiveResume } from "@/lib/resume-server";

/**
 * POST /api/ai/interview-prep
 * Body: { applicationId: string }
 * Returns: { questions: { category: string; question: string; tip: string }[] }
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
    select: { title: true, companyName: true, jobDescription: true, notes: true },
  });
  if (!app) return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });

  let resumeSummary = "";
  const data = parseActiveResume(userData?.resumeData);
  if (data) {
    resumeSummary = [
      data.role ? `Ønsket rolle: ${data.role}` : "",
      data.summary ? `Profil: ${String(data.summary).slice(0, 400)}` : "",
      Array.isArray(data.experience) && data.experience.length
        ? `Erfaring: ${data.experience
            .slice(0, 4)
            .map((e) => `${e.title} hos ${e.company}`)
            .join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

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

  const credit = await consumeAiCredit(session.userId, "interview_prep");
  if (!credit.ok) return quotaErrorResponse(credit);

  try {
    const raw = await claudeGenerate(userPrompt, {
      system,
      temperature: 0.6,
      maxOutputTokens: 2500,
      json: true,
      onUsage: (u) => void recordAiUsageEvent(session.userId, "interview_prep", "claude-sonnet-4-6", u),
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
