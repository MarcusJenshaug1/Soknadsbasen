import { NextResponse } from "next/server";
import {
  verifyCollabAnonJwt,
  checkSuggestRateLimit,
  recordSuggest,
} from "@/lib/collabToken";
import { claudeGenerate } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/collab/ai-improve
 * Header: Authorization: Bearer <anon-JWT>
 * Body: { text, kind? }
 *
 * Lar en invitert medhjelper bruke AI til å forbedre en CV-tekst FØR de
 * sender den som forslag. Returnerer kun forbedret tekst (anti-hallusinasjon:
 * omformulerer, finner aldri på fakta).
 */
const KIND_GUIDE: Record<string, string> = {
  summary: "et CV-sammendrag (profil)",
  role: "en ønsket rolle-/stillingstittel",
  experience: "en beskrivelse av arbeidserfaring i en CV",
  education: "en beskrivelse av utdanning i en CV",
  generic: "en tekst i en CV",
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Mangler bearer-token" }, { status: 401 });
  }
  let claims;
  try {
    claims = await verifyCollabAnonJwt(auth.slice(7));
  } catch {
    return NextResponse.json({ error: "Ugyldig eller utløpt token" }, { status: 401 });
  }
  if (!checkSuggestRateLimit(claims.sessionId)) {
    return NextResponse.json(
      { error: "For mange AI-forespørsler. Vent litt." },
      { status: 429 },
    );
  }
  recordSuggest(claims.sessionId);

  let body: { text?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Mangler tekst å forbedre" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "Teksten er for lang" }, { status: 400 });
  }
  const kindGuide = KIND_GUIDE[body.kind ?? "generic"] ?? KIND_GUIDE.generic;

  const system = `Du er en erfaren CV-coach. Du forbedrer ${kindGuide} på norsk: gjør teksten klarere, mer konkret og resultatorientert med aktive verb. KRITISK ANTI-HALLUSINASJON: ikke finn på fakta, tall, titler eller erfaringer som ikke står i originalen — kun omformuler og stram opp det som faktisk er der. Behold norsk språk. Svar med KUN den forbedrede teksten, uten forklaring og uten anførselstegn rundt.`;

  try {
    const improved = await claudeGenerate(text, {
      system,
      maxOutputTokens: 800,
    });
    return NextResponse.json({ improved: improved.trim() });
  } catch {
    return NextResponse.json(
      { error: "AI-forbedring feilet. Prøv igjen." },
      { status: 502 },
    );
  }
}
