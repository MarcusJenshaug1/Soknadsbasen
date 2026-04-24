import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { geminiGenerate } from "@/lib/gemini";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email))
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });

  const { thread, draft, subject } = await req.json().catch(() => ({}));

  const prompt = [
    subject && `Emne: ${subject}`,
    thread && `E-posttråd (originalmeldingen):\n---\n${thread}\n---`,
    draft && `Utkast så langt:\n${draft}`,
    !draft && !thread && "Hjelp med å skrive en profesjonell e-post.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const reply = await geminiGenerate(prompt, {
      system: `Du er en profesjonell e-postassistent for Søknadsbasen, en norsk jobbsøk-plattform.
Skriv svar på norsk. Vær kortfattet, vennlig og profesjonell.
Skriv bare selve e-postteksten — ingen emnejlinje, ingen avsender, ingen forklaring.
Ikke start med "Hei [navn]," hvis du ikke kjenner mottakers navn.`,
      temperature: 0.6,
      maxOutputTokens: 1024,
    });
    return NextResponse.json({ text: reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI-feil";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
