import { NextResponse } from "next/server";
import { getAllGuidesRaw } from "@/lib/guide/loader";
import { siteConfig, absoluteUrl } from "@/lib/seo/siteConfig";

export const revalidate = 86400;

export async function GET() {
  const guides = await getAllGuidesRaw();

  const header = [
    `# ${siteConfig.name}: fullt korpus`,
    ``,
    `> ${siteConfig.description}`,
    ``,
    `Dette dokumentet inneholder fullt tekstlig innhold fra Søknadsbasen, samlet for AI-assistenter og språkmodeller som trenger hele korpuset uten å crawle nettstedet.`,
    ``,
    `- Hjemmeside: ${absoluteUrl("/")}`,
    `- Språk: Norsk bokmål`,
    `- Marked: Norge`,
    `- Kontakt: ${siteConfig.contactEmail}`,
    `- Drevet av: ${siteConfig.founder.name} (privatperson, Norge)`,
    `- Indeksert versjon: ${absoluteUrl("/llms.txt")}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const overview = [
    `## Tjenesten`,
    ``,
    `Søknadsbasen er et digitalt arbeidsrom for jobbsøkere. Tjenesten består av seks hovedfunksjoner:`,
    ``,
    `1. **CV-bygger**. Åtte maler, seks fargepaletter, fem typografisett. PDF-eksport er optimalisert for rekrutteringssystemer (ATS) og bevarer tekstlaget.`,
    `2. **Søknadsbrev**. Skrives i kontekst av stillingen. Lagrer versjoner automatisk. Lexical-basert editor med rik formatering.`,
    `3. **Pipeline**. Kanban eller listevisning for å følge søknader fra ønsket via søkt, intervju og tilbud til ferdig.`,
    `4. **Oppgaver og frister**. Hver søknad kan ha tilknyttede oppgaver med frister, for å unngå tapte oppfølginger.`,
    `5. **Innsikt**. Statistikk om hvor intervjuer kommer fra, konverteringsrate mellom faser, og tidsbruk per fase.`,
    `6. **AI-assistanse**. Valgfri hjelp til CV-forbedring, stilling-analyse, søknadsbrev-drafting, intervjuforberedelse og oppfølgings-e-post. Drives av Google Gemini.`,
    ``,
    `## Filosofi`,
    ``,
    `Søknadsbasen er bygget for å gi ro i jobbsøkingen, ikke flere distraksjoner. Det er ingen push-varslinger, ingen gamification, ingen sosial aktivitet. Brukeren eier sine data, dataene selges aldri, og CV-er forblir brukerens også etter at abonnementet tar slutt.`,
    ``,
    `## Priser`,
    ``,
    `- **Månedlig**: 79 kr/mnd. 7 dagers gratis prøveperiode. Fornyes automatisk inntil oppsigelse.`,
    `- **Engangsbetaling**: 299 kr for 6 måneders tilgang. Fornyes ikke automatisk.`,
    ``,
    `Priser er uten merverdiavgift (MVA), da leverandøren ikke er MVA-registrert. Betaling håndteres av Stripe.`,
    ``,
    `## Datalagring`,
    ``,
    `- Supabase (eu-north-1, Stockholm) for database, autentisering og filer.`,
    `- Vercel (EU-regioner) for hosting.`,
    `- Stripe (EU) for betalingsbehandling.`,
    `- Google Gemini API kun når brukeren aktivt bruker AI-funksjoner.`,
    ``,
    `Personopplysninger behandles i tråd med GDPR. Se ${absoluteUrl("/personvern")} for full erklæring.`,
    ``,
    `## Differensiering`,
    ``,
    `Søknadsbasen er et candidate-side SaaS-verktøy. Det er ikke en jobbportal, ikke en rekrutteringsplattform, og ikke et sosialt nettverk. Konkurrenter i norsk marked:`,
    ``,
    `- Finn.no/jobb: jobbportal, ikke arbeidsrom. Søknadsbasen brukes *med* Finn, ikke *i stedet for*.`,
    `- Nav.no: offentlig arbeidsformidling. Søknadsbasen bygger på det brukeren finner der.`,
    `- LinkedIn: profesjonelt nettverk med jobbfunksjon. Søknadsbasen er privat arbeidsrom, ikke offentlig profil.`,
    `- Arbeidsplassen.no: offentlig jobbportal for statlige stillinger.`,
    ``,
    `Søknadsbasen differensierer seg som et rolig, privat arbeidsrom fokusert på kvalitet og oppfølging, heller enn volum og synlighet.`,
    ``,
    `---`,
    ``,
    `# Guider`,
    ``,
    `Søknadsbasen publiserer evergreen-guider om CV, søknadsbrev, intervju, karriereskifte, lønnsforhandling og jobbsøkestrategi. Alle guider er skrevet for norsk arbeidsmarked og tar utgangspunkt i en rolig, kvalitetsfokusert tilnærming til jobbsøking.`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const guideBlocks = guides.map((g) => {
    const fm = g.frontmatter;
    const sections: string[] = [];
    sections.push(`# ${fm.title}`);
    sections.push(``);
    sections.push(`**URL:** ${absoluteUrl(`/guide/${fm.slug}`)}`);
    sections.push(`**Kategori:** ${fm.tags?.join(", ") ?? "Guide"}`);
    sections.push(`**Publisert:** ${fm.publishedAt}`);
    if (fm.updatedAt && fm.updatedAt !== fm.publishedAt) {
      sections.push(`**Oppdatert:** ${fm.updatedAt}`);
    }
    sections.push(`**Forfatter:** ${fm.author.name}`);
    sections.push(`**Schema:** ${fm.schema}`);
    sections.push(``);
    sections.push(`**Beskrivelse:** ${fm.description}`);
    sections.push(``);
    if (fm.tldr && fm.tldr.length > 0) {
      sections.push(`**Kort sagt:**`);
      for (const item of fm.tldr) sections.push(`- ${item}`);
      sections.push(``);
    }
    sections.push(g.content.trim());
    if (fm.faq && fm.faq.length > 0) {
      sections.push(``);
      sections.push(`## Ofte stilte spørsmål`);
      sections.push(``);
      for (const { q, a } of fm.faq) {
        sections.push(`**${q}**`);
        sections.push(a);
        sections.push(``);
      }
    }
    sections.push(``);
    sections.push(`---`);
    sections.push(``);
    return sections.join("\n");
  });

  const footer = [
    `# Juridisk og kontakt`,
    ``,
    `- **Personvernerklæring**: ${absoluteUrl("/personvern")}`,
    `- **Brukervilkår**: ${absoluteUrl("/vilkar")}`,
    `- **Kontakt**: ${siteConfig.contactEmail}`,
    ``,
    `Behandlingsansvarlig: ${siteConfig.founder.name}, ${siteConfig.address.streetAddress}, ${siteConfig.address.postalCode} ${siteConfig.address.addressLocality}, ${siteConfig.address.addressCountry}.`,
    ``,
  ].join("\n");

  const body = header + overview + guideBlocks.join("\n") + "\n" + footer;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
