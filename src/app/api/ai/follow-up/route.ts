import { NextResponse } from "next/server";
import { marked } from "marked";
import { getSession } from "@/lib/auth";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { consumeAiCredit, refundAiCredit, recordAiUsageEvent } from "@/lib/ai/credits";
import { quotaErrorResponse } from "@/lib/ai/quota-response";
import { prisma } from "@/lib/prisma";
import { claudeGenerate } from "@/lib/claude";
import { parseLooseJson } from "@/lib/json";

marked.setOptions({ gfm: true, breaks: false });

/**
 * POST /api/ai/follow-up
 * Body: { applicationId: string, daysSince?: number }
 * Returns: { subject: string, body: string (HTML), markdown: string }
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  if (!checkAiRateLimit(session.userId)) return NextResponse.json({ error: AI_RATE_LIMIT_MESSAGE }, { status: 429 });

  const body = (await req.json()) as { applicationId?: string; daysSince?: number };
  if (!body.applicationId) {
    return NextResponse.json({ error: "applicationId er påkrevd" }, { status: 400 });
  }

  const app = await prisma.jobApplication.findFirst({
    where: { id: body.applicationId, userId: session.userId },
    select: {
      title: true,
      companyName: true,
      applicationDate: true,
      contactName: true,
      contactEmail: true,
    },
  });
  if (!app) return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });

  const days =
    body.daysSince ??
    (app.applicationDate
      ? Math.max(
          1,
          Math.round((Date.now() - app.applicationDate.getTime()) / 86_400_000),
        )
      : 5);

  const system = `Du skriver kort, nøktern oppfølgings-e-post på norsk bokmål til en rekrutterer ${days} dager etter at kandidaten har sendt søknad. Returner GYLDIG JSON:

{
  "subject": "Emne, maks 60 tegn",
  "body": "Markdown-brødtekst. 2-3 korte avsnitt. Ingen hilsen eller signatur — kun brødtekst."
}

Regler:
- Profesjonell, ikke masete. Uttrykk oppriktig interesse.
- Vis til at du søkte for ${days} dager siden.
- Spør kort om status eller neste steg.
- Ikke gjenta hele CVen — én setning om hvorfor du fortsatt er motivert.
- Ingen klisjéer, ingen utropstegn.
- Returner KUN JSON. Ingen code fence.`;

  const userPrompt = `Stilling: ${app.title}\nSelskap: ${app.companyName}${
    app.contactName ? `\nKontaktperson: ${app.contactName}` : ""
  }${app.applicationDate ? `\nSøknadsdato: ${app.applicationDate.toISOString().slice(0, 10)}` : ""}`;

  const credit = await consumeAiCredit(session.userId, "follow_up");
  if (!credit.ok) return quotaErrorResponse(credit);

  try {
    const raw = await claudeGenerate(userPrompt, {
      system,
      temperature: 0.7,
      maxOutputTokens: 1000,
      json: true,
      onUsage: (u) => void recordAiUsageEvent(session.userId, "follow_up", "claude-sonnet-4-6", u),
    });
    const parsed = parseLooseJson<{ subject: string; body: string }>(raw);
    const html = marked.parse(parsed.body, { async: false }) as string;
    return NextResponse.json({
      subject: parsed.subject,
      markdown: parsed.body,
      body: html,
      contactEmail: app.contactEmail ?? null,
    });
  } catch (err) {
    await refundAiCredit(session.userId, credit.source, credit.periodStart);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
