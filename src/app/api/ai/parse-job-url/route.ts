import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";

/**
 * POST /api/ai/parse-job-url
 * Body: { url: string } OR { text: string }
 * Returns: { title, companyName, source, jobDescription, location?, deadline?, salary? }
 *
 * Fetches the URL, strips HTML to text, sends to Gemini with strict schema.
 * If `text` is provided directly (paste-in flow), we skip the fetch.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as { url?: string; text?: string };

  let rawText = "";
  let sourceUrl: string | null = null;

  if (body.text?.trim()) {
    rawText = body.text.slice(0, 40000);
  } else if (body.url?.trim()) {
    sourceUrl = body.url.trim();
    try {
      const fetched = await fetchPage(sourceUrl);
      rawText = htmlToText(fetched).slice(0, 40000);
    } catch (err) {
      console.error("[parse-job-url] fetch failed:", err);
      return NextResponse.json(
        {
          error:
            "Klarte ikke å hente siden. LinkedIn-annonser kan kreve innlogging — lim inn teksten manuelt i stedet.",
        },
        { status: 502 },
      );
    }
  } else {
    return NextResponse.json({ error: "Trenger url eller text" }, { status: 400 });
  }

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "Fant ingen tekst å tolke." },
      { status: 422 },
    );
  }

  const source = sourceUrl ? inferSource(sourceUrl) : null;

  const system = `Du trekker ut strukturerte data fra en stillingsannonse. Returner GYLDIG JSON etter skjemaet. Ikke finn på noe som ikke står eksplisitt i teksten.

SCHEMA:
{
  "title": "stillingstittelen",
  "companyName": "navnet på selskapet som utlyser",
  "companyWebsite": "selskapets offisielle nettsted (domene, f.eks. schibsted.no). Tom streng hvis ikke eksplisitt oppgitt eller åpenbart utledbart fra annonsen.",
  "source": "LinkedIn | FINN.no | Webcruiter | Annet",
  "location": "arbeidssted — by, land — tom streng hvis ikke oppgitt",
  "deadline": "YYYY-MM-DD hvis søknadsfrist oppgis, ellers tom streng",
  "salary": "oppgitt lønn eller tom streng",
  "jobDescription": "Full stillingsbeskrivelse bevart i Markdown. Bruk ##-overskrifter der annonsen har seksjoner (f.eks. 'Om rollen', 'Kvalifikasjoner', 'Vi tilbyr'), bullets der originalen har lister. Behold alt innhold verbatim — ikke sammendrag, ikke omskriv."
}

Regler:
- IKKE oppsummer — behold full beskrivelse.
- Hvis data mangler, bruk tom streng — ikke gjett.
- Fjern navigasjon, cookies-varsler, footer-støy, "søk nå"-knapper, relaterte stillinger.
- Returner KUN JSON.`;

  const userPrompt = `${sourceUrl ? `URL: ${sourceUrl}\n\n` : ""}=== SIDEINNHOLD ===\n${rawText}\n=== SLUTT ===`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.2,
      maxOutputTokens: 8192,
      json: true,
    });
    const parsed = parseLooseJson<{
      title?: string;
      companyName?: string;
      companyWebsite?: string;
      source?: string;
      location?: string;
      deadline?: string;
      salary?: string;
      jobDescription?: string;
    }>(raw);

    return NextResponse.json({
      title: parsed.title ?? "",
      companyName: parsed.companyName ?? "",
      companyWebsite: parsed.companyWebsite ?? "",
      source: parsed.source || source || "",
      location: parsed.location ?? "",
      deadline: parsed.deadline ?? "",
      salary: parsed.salary ?? "",
      jobDescription: parsed.jobDescription ?? "",
      sourceUrl,
    });
  } catch (err) {
    console.error("[parse-job-url] gemini failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Kunne ikke tolke stillingen.",
      },
      { status: 502 },
    );
  }
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Soknadsbasen/1.0; +https://soknadsbasen.no)",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "nb,no,en;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Strips HTML tags and collapses whitespace — good enough for LLM input. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|br|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

function inferSource(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("finn.no")) return "FINN.no";
    if (host.includes("webcruiter")) return "Webcruiter";
    if (host.includes("nav.no")) return "NAV";
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}
