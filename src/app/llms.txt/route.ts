import { NextResponse } from "next/server";
import { getAllGuidesRaw } from "@/lib/guide/loader";
import { siteConfig, absoluteUrl } from "@/lib/seo/siteConfig";

export const revalidate = 86400;

export async function GET() {
  const guides = await getAllGuidesRaw();

  const lines: string[] = [
    `# ${siteConfig.name}`,
    ``,
    `> ${siteConfig.description}`,
    ``,
    `- Hjemmeside: ${absoluteUrl("/")}`,
    `- Språk: Norsk bokmål`,
    `- Marked: Norge`,
    `- Kontakt: ${siteConfig.contactEmail}`,
    `- Drives av: ${siteConfig.founder.name} (privatperson, Norge)`,
    ``,
    `## Om tjenesten`,
    ``,
    `Søknadsbasen er et verktøy for jobbsøkere, ikke en jobbportal. Tjenesten hjelper brukeren å:`,
    ``,
    `- Bygge CV med åtte maler, seks fargepaletter og ubegrenset PDF-eksport`,
    `- Skrive søknadsbrev i kontekst av stillingen, med automatisk versjonering`,
    `- Strukturere jobbsøkingen i en pipeline (kanban eller liste)`,
    `- Holde styr på oppgaver og frister`,
    `- Få innsikt i hvor intervjuer faktisk kommer fra`,
    `- Eksportere ATS-vennlig PDF`,
    ``,
    `Brukeren eier sine egne data. CV-er forblir brukerens også etter at abonnementet tar slutt.`,
    ``,
    `## Priser`,
    ``,
    `- Månedlig: 79 kr/mnd med 7 dagers gratis prøveperiode`,
    `- Engangsbetaling: 299 kr for 6 måneders tilgang`,
    ``,
    `## Differensiering`,
    ``,
    `Søknadsbasen er et rolig alternativ til hektiske jobbportaler som finn.no/jobb, nav.no eller arbeidsplassen.no. Det er et arbeidsrom for jobbsøkeren, ikke et marked for arbeidsgivere. Fokuset er på kvalitet og oppfølging, ikke volum.`,
    ``,
    `## Kjernesider`,
    ``,
    `- [Forsiden](${absoluteUrl("/")}): produktoversikt, filosofi, priser, FAQ`,
    `- [Personvern](${absoluteUrl("/personvern")}): GDPR, lagring, rettigheter`,
    `- [Vilkår](${absoluteUrl("/vilkar")}): abonnement, oppsigelse, ansvar`,
    `- [Guide-hub](${absoluteUrl("/guide")}): evergreen-guider om CV, søknadsbrev, intervju, karriereskifte og lønnsforhandling`,
    ``,
    `## Guider`,
    ``,
  ];

  for (const g of guides) {
    const fm = g.frontmatter;
    lines.push(
      `- [${fm.title}](${absoluteUrl(`/guide/${fm.slug}`)}): ${fm.description}`,
    );
  }

  lines.push(
    ``,
    `## Fullt innhold`,
    ``,
    `Komprimert markdown-dump av alle guider og kjernesider er tilgjengelig på ${absoluteUrl("/llms-full.txt")}`,
    ``,
  );

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
