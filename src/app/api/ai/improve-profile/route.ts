import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/lib/ai/rate-limit";
import { consumeAiCredit, refundAiCredit, recordAiUsageEvent } from "@/lib/ai/credits";
import { quotaErrorResponse } from "@/lib/ai/quota-response";
import { prisma } from "@/lib/prisma";
import { claudeStream } from "@/lib/claude";
import { parseActiveResume } from "@/lib/resume-server";

/**
 * POST /api/ai/improve-profile
 * Body: { summary?: string, tone?: "varm" | "formell" | "konsis" }
 *
 * Returns a rewritten profile summary based on the user's existing CV data.
 * The AI must ONLY use facts present in the resume — no hallucinated experience.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  if (!checkAiRateLimit(session.userId)) return NextResponse.json({ error: AI_RATE_LIMIT_MESSAGE }, { status: 429 });

  const body = (await req.json()) as {
    summary?: string;
    tone?: "varm" | "formell" | "konsis";
  };

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });

  let cvSummary = "";
  const data = parseActiveResume(userData?.resumeData);
  if (data) {
    const exp = Array.isArray(data.experience) ? data.experience : [];
    const skills = Array.isArray(data.skills)
      ? data.skills.slice(0, 15).filter(Boolean)
      : [];
    cvSummary = [
      data.role ? `Ønsket rolle: ${data.role}` : "",
      exp.length
        ? `Erfaring: ${exp
            .slice(0, 4)
            .map(
              (e) =>
                `${e.title} hos ${e.company}${
                  e.description ? ` — ${String(e.description).slice(0, 150)}` : ""
                }`,
            )
            .join("; ")}`
        : "",
      skills.length ? `Ferdigheter: ${skills.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (!cvSummary) {
    return NextResponse.json(
      {
        error:
          "CV-en din er tom. Fyll inn erfaring og ferdigheter først — da har AI noe å bygge på.",
      },
      { status: 400 },
    );
  }

  const tone = body.tone ?? "varm";
  const toneHint: Record<string, string> = {
    varm: "Varm og personlig, men profesjonell.",
    formell: "Nøktern, presis, formell.",
    konsis: "Tett, direkte, maks 3 setninger.",
  };

  const system = `Du skriver en profil-tekst (sammendrag) for øverst på en CV. Norsk bokmål.

Tone: ${toneHint[tone]}
Lengde: 3-5 korte setninger (maks ~80 ord).

Regler:
- Bruk KUN informasjon som står i kildene nedenfor. Ikke finn på noe.
- Ingen klisjéer ("dynamisk", "lidenskapelig", "teamplayer", "resultatorientert").
- Ingen overskrift. Ingen bullets. Kun fri prosa.
- Ikke skriv "Jeg er en …" — start med konkret erfaring eller fagfelt.
- Returner KUN teksten. Ingen forklaring, ingen anførselstegn.`;

  const userPrompt = `KANDIDAT (hent fakta HERFRA):
${cvSummary}

${body.summary ? `EKSISTERENDE PROFIL-TEKST (forbedre denne, behold fakta):\n${body.summary}` : "Ingen eksisterende profil — skriv én fra bunn av basert på CV-dataene."}`;

  const credit = await consumeAiCredit(session.userId, "improve_profile");
  if (!credit.ok) return quotaErrorResponse(credit);

  // Streaming: refunder kun hvis kallet feiler FØR Response er sendt —
  // mid-stream-feil etter at headere er ute refunderes ikke (akseptert).
  let claudeReadable: ReadableStream<string>;
  try {
    claudeReadable = await claudeStream(userPrompt, {
      system,
      temperature: 0.7,
      maxOutputTokens: 400,
      onUsage: (u) =>
        void recordAiUsageEvent(session.userId, "improve_profile", "claude-sonnet-4-6", u),
    });
  } catch (err) {
    await refundAiCredit(session.userId, credit.source, credit.periodStart);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const claudeReader = claudeReadable.getReader();

  const outputStream = new ReadableStream({
    async start(controller) {
      let accumulated = "";
      try {
        while (true) {
          const { done, value } = await claudeReader.read();
          if (done) break;
          accumulated += value;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: value })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, text: accumulated.trim() })}\n\n`));
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "AI-feil" })}\n\n`),
        );
      }
      controller.close();
    },
  });

  return new Response(outputStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
