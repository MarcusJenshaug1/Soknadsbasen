import { NextResponse } from "next/server";
import { marked } from "marked";
import { getSession } from "@/lib/auth";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";

marked.setOptions({ gfm: true, breaks: false });

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/parse-cv
 * Body: FormData with field `file` (PDF).
 *
 * Extracts raw text from the PDF, sends it to Gemini with a strict schema +
 * anti-hallucination system prompt, returns a partial ResumeData JSON.
 *
 * Critical rule: the model may ONLY return data that is literally present in
 * the source text. Missing fields are returned as empty strings / empty arrays.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil lastet opp" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Bare PDF-filer støttes" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fil er for stor (maks 10 MB)" }, { status: 400 });
  }

  let rawText: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    rawText = await extractPdfText(new Uint8Array(arrayBuffer));
  } catch (err) {
    console.error("[parse-cv] pdf extract failed:", err);
    return NextResponse.json(
      { error: "Kunne ikke lese PDFen. Prøv en annen fil." },
      { status: 422 },
    );
  }

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "Fant ingen lesbar tekst i PDFen — kan være skannet bilde." },
      { status: 422 },
    );
  }

  const system = `Du er en presis CV-parser. Oppgaven din er å trekke ut strukturerte data fra rå CV-tekst og returnere GYLDIG JSON som matcher skjemaet nedenfor.

KRITISKE REGLER (brudd er ikke tillatt):
1. Ta KUN med data som står eksplisitt i kildeteksten. Ikke finn på, ikke utled, ikke "oversett" mellom språk, ikke legg til, ikke fjern fakta.
2. Hvis et felt ikke finnes i kildeteksten, bruk tom streng "" eller tom array [].
3. Beskrivelser (description-felt) skal være i **Markdown** for bedre lesbarhet:
   - Bryt wall-of-text i avsnitt der kilden har punktum-ladede setninger som åpenbart hører sammen. Hvert avsnitt = blank linje.
   - Kildetekst som inneholder ":" eller "•" eller "-" foran korte setninger skal bli ekte markdown-bullets ("- punkt").
   - Bruk **fet skrift** KUN på underoverskrifter som står slik i kilden (f.eks. "Ansvar:", "Oppgaver:").
   - IKKE omskriv, ikke utvid, ikke kutt — samme ord, samme rekkefølge, bare bedre formatering.
   - Om kilden allerede er én kort setning: la det stå som én setning uten bullets.
4. Datoer: bruk formatet "YYYY-MM" hvis du har måned+år, "YYYY" hvis bare år. Hvis datoen står som "nå" / "current" / "pågående", sett current=true og endDate="".
5. Ferdigheter: én streng per ferdighet, ikke slå sammen.
6. Hvis LinkedIn-profil: "Experience"-seksjonen er flat (posisjon + selskap + varighet + bullets). Trekk ut som det er.
7. IKKE inkluder informasjon du "antar" fra navn/stilling/firma.

SCHEMA (returner nøyaktig denne strukturen):
{
  "contact": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  },
  "role": "",
  "summary": "",
  "experience": [
    {
      "title": "",
      "company": "",
      "location": "",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "current": false,
      "description": ""
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "field": "",
      "location": "",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "current": false,
      "description": ""
    }
  ],
  "skills": ["", ""],
  "languages": [
    { "name": "", "level": "" }
  ],
  "certifications": [
    { "name": "", "issuer": "", "date": "YYYY-MM", "url": "" }
  ],
  "projects": [
    { "name": "", "role": "", "description": "", "url": "" }
  ],
  "interests": []
}

Returner KUN JSON. Ingen markdown, ingen forklaringer, ingen code fence.`;

  const truncated = rawText.slice(0, 18000);
  const userPrompt = `Her er rå tekst hentet fra kandidatens CV / LinkedIn-eksport. Trekk ut strukturerte data etter skjemaet.

=== KILDETEKST ===
${truncated}
=== SLUTT KILDETEKST ===`;

  let json: unknown;
  let rawResponse = "";
  try {
    rawResponse = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.1,
      maxOutputTokens: 8192,
      json: true,
    });
    json = parseLooseJson(rawResponse);
    // Convert description Markdown → HTML so templates' dangerouslySetInnerHTML
    // renders lists/bold etc. nicely. Templates already expect HTML.
    convertDescriptionsToHtml(json as Record<string, unknown>);
  } catch (err) {
    console.error(
      "[parse-cv] gemini/parse failed:",
      err,
      "\n--- Gemini raw (first 500 chars) ---\n",
      rawResponse.slice(0, 500),
    );
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message.startsWith("Gemini")
            ? err.message
            : "AI kunne ikke tolke CVen. Prøv en annen fil eller fyll ut manuelt.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: json,
    // Short preview so the UI can show what was extracted
    rawTextPreview: rawText.slice(0, 600),
    textLength: rawText.length,
  });
}

/**
 * Walks parsed resume data and converts every `description` field from
 * Markdown to HTML in place. Empty / missing values are preserved.
 */
function convertDescriptionsToHtml(root: Record<string, unknown>) {
  const LIST_KEYS = [
    "experience",
    "education",
    "projects",
    "courses",
    "volunteering",
    "awards",
    "publications",
    "certifications",
  ];
  for (const key of LIST_KEYS) {
    const arr = root[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const desc = rec.description;
      if (typeof desc === "string" && desc.trim()) {
        rec.description = marked.parse(desc, { async: false }) as string;
      }
    }
  }
  // Summary is a block field too — templates expect HTML.
  const summary = root.summary;
  if (typeof summary === "string" && summary.trim()) {
    root.summary = marked.parse(summary, { async: false }) as string;
  }
}

/* ─── PDF text extraction (copied from legacy route) ─────── */
async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    const lineTexts: string[] = [];
    let currentLine = "";

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = textItem.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) lineTexts.push(currentLine.trim());
        currentLine = textItem.str;
      } else {
        currentLine += (currentLine ? " " : "") + textItem.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lineTexts.push(currentLine.trim());
    pages.push(lineTexts.join("\n"));
  }
  return pages.join("\n");
}
