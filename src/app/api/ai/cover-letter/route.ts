import { NextResponse } from "next/server";
import { marked } from "marked";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";

marked.setOptions({ gfm: true, breaks: false });

type ResumeData = {
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  role?: string;
  summary?: string;
  experience?: {
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }[];
  education?: {
    school?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }[];
  skills?: { name?: string; level?: string }[];
  languages?: { name?: string; level?: string }[];
  certifications?: { name?: string; issuer?: string }[];
};

function buildResumeContext(raw: string | null | undefined): string {
  if (!raw) return "";
  let data: ResumeData;
  try {
    data = JSON.parse(raw) as ResumeData;
  } catch {
    return "";
  }
  const lines: string[] = [];

  const fullName = [data.contact?.firstName, data.contact?.lastName]
    .filter(Boolean)
    .join(" ");
  if (fullName) lines.push(`Navn: ${fullName}`);
  if (data.contact?.email) lines.push(`E-post: ${data.contact.email}`);
  if (data.contact?.phone) lines.push(`Telefon: ${data.contact.phone}`);
  if (data.contact?.location) lines.push(`Sted: ${data.contact.location}`);
  if (data.role) lines.push(`Ønsket rolle: ${data.role}`);
  if (data.summary) lines.push(`\nProfil:\n${data.summary}`);

  if (data.experience?.length) {
    lines.push("\nErfaring:");
    for (const e of data.experience.slice(0, 6)) {
      const span = [e.startDate, e.current ? "nå" : e.endDate]
        .filter(Boolean)
        .join("–");
      lines.push(
        `- ${e.title ?? ""} hos ${e.company ?? ""}${span ? ` (${span})` : ""}${
          e.description ? `\n  ${String(e.description).slice(0, 300)}` : ""
        }`,
      );
    }
  }
  if (data.education?.length) {
    lines.push("\nUtdanning:");
    for (const e of data.education.slice(0, 4)) {
      lines.push(
        `- ${e.degree ?? ""} ${e.field ? `i ${e.field}` : ""} – ${e.school ?? ""}`,
      );
    }
  }
  if (data.skills?.length) {
    lines.push(
      `\nFerdigheter: ${data.skills
        .slice(0, 15)
        .map((s) => s.name)
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  if (data.languages?.length) {
    lines.push(
      `Språk: ${data.languages
        .map((l) => [l.name, l.level].filter(Boolean).join(" "))
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  if (data.certifications?.length) {
    lines.push(
      `Sertifiseringer: ${data.certifications
        .map((c) => [c.name, c.issuer].filter(Boolean).join(" — "))
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  return lines.filter(Boolean).join("\n");
}

/**
 * POST /api/ai/cover-letter
 * Body: { applicationId: string, tone?: "formell" | "varm" | "konsis" }
 * Returns: { body: string } — HTML rendered from a Markdown draft.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const body = (await req.json()) as {
    applicationId?: string;
    tone?: "formell" | "varm" | "konsis";
    letter?: {
      senderName?: string | null;
      senderEmail?: string | null;
      senderPhone?: string | null;
      senderLocation?: string | null;
      recipientName?: string | null;
      recipientTitle?: string | null;
      companyAddress?: string | null;
    };
  };
  if (!body.applicationId) {
    return NextResponse.json(
      { error: "applicationId er påkrevd" },
      { status: 400 },
    );
  }

  const app = await prisma.jobApplication.findFirst({
    where: { id: body.applicationId, userId: session.userId },
    select: {
      companyName: true,
      title: true,
      jobDescription: true,
      notes: true,
    },
  });
  if (!app) {
    return NextResponse.json({ error: "Søknad ikke funnet" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true },
  });

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });

  const resumeContext = buildResumeContext(userData?.resumeData);

  const tone = body.tone ?? "varm";
  const toneHint: Record<string, string> = {
    formell: "Profesjonell og nøktern tone. Unngå slang.",
    varm: "Varm, personlig, men profesjonell.",
    konsis: "Kort og rett på sak. Maks tre korte avsnitt.",
  };

  const system = `Du skriver søknadsbrev på norsk bokmål for en jobbsøker-plattform.

Tone: ${toneHint[tone]}

Format: Markdown. Du KAN bruke:
- **fet skrift** for å fremheve nøkkelord og prestasjoner
- *kursiv* sparsomt, for tittelen på stillingen ved første nevnelse
- ## Underoverskrifter hvis brevet er langt nok til at det hjelper lesbarheten (f.eks. "Hvorfor ${app.companyName}", "Min erfaring", "Neste steg")
- - Punktlister når du lister konkrete prestasjoner, teknologier eller koblinger mellom krav og erfaring (maks 5 punkter per liste)
- > Sitater kun hvis kandidaten har en kjent publikasjon/uttalelse — ellers ikke

IKKE inkluder:
- H1 (overordnet tittel) — brevet har allerede emne-felt utenfor brødteksten
- Hilsen ("Hei X,") eller avslutning ("Med vennlig hilsen") — de ligger i egne felter
- Signatur med navn — allerede i feltet avsender
- Klisjéer som "dynamisk", "lidenskapelig", "teamplayer", "tenker utenfor boksen"
- Erfaring som ikke står i kandidatens CV — ikke finn opp noe

Struktur (tilpass lengde til tone):
1. Åpning: 1-2 setninger om hvorfor rollen og selskapet appellerer
2. Midt: konkrete koblinger mellom stillingens krav og kandidatens erfaring
3. Avslutning: kort, nøktern invitasjon til samtale`;

  const senderBlock = [
    body.letter?.senderName && `Navn: ${body.letter.senderName}`,
    body.letter?.senderEmail && `E-post: ${body.letter.senderEmail}`,
    body.letter?.senderPhone && `Telefon: ${body.letter.senderPhone}`,
    body.letter?.senderLocation && `Sted: ${body.letter.senderLocation}`,
  ]
    .filter(Boolean)
    .join("\n");

  const recipientBlock = [
    body.letter?.recipientName && `Kontaktperson: ${body.letter.recipientName}`,
    body.letter?.recipientTitle && `Stilling: ${body.letter.recipientTitle}`,
    body.letter?.companyAddress && `Adresse: ${body.letter.companyAddress}`,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `STILLING
Tittel: ${app.title}
Selskap: ${app.companyName}
${app.jobDescription ? `\nStillingsbeskrivelse:\n${app.jobDescription}` : ""}
${app.notes ? `\nEgne notater fra kandidaten:\n${app.notes}` : ""}

${recipientBlock ? `MOTTAKER\n${recipientBlock}\n` : ""}
${senderBlock ? `AVSENDER\n${senderBlock}\n` : ""}
KANDIDATENS CV
${
  resumeContext ||
  `(Kandidaten har ikke fylt ut CV ennå — skriv basert kun på jobbeskrivelsen og hold deg generell om kandidatens bakgrunn.)`
}

Skriv brødteksten til søknadsbrevet i Markdown. Adresser kontaktpersonen ved navn hvis oppgitt. Bruk avsenderens navn/kontaktinfo bare hvis det passer naturlig i teksten — den vises uansett i egne felter utenfor brødteksten.`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.8,
      maxOutputTokens: 1500,
    });

    // Strip accidental code fences Gemini sometimes adds around markdown.
    const cleaned = raw
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const html = marked.parse(cleaned, { async: false }) as string;

    return NextResponse.json({ body: html, markdown: cleaned });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}
