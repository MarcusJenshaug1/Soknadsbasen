export type ComparisonValue = "yes" | "no" | "partial" | string;

export type ComparisonRow = {
  feature: string;
  soknadsbasen: ComparisonValue;
  competitor: ComparisonValue;
  note?: string;
};

export type Competitor = {
  slug: string;
  name: string;
  homepage?: string;
  shortName: string;
  category: string;
  publishedAt: string;
  intro: string[];
  whatItIs: string[];
  comparisonTable: ComparisonRow[];
  competitorStrengths: string[];
  competitorWeaknesses: string[];
  soknadsbasenStrengths: string[];
  whenToChooseCompetitor: string;
  whenToChooseSoknadsbasen: string;
  faq: Array<{ q: string; a: string }>;
};

export const COMPETITORS: Competitor[] = [
  {
    slug: "cv-no",
    name: "CV.no",
    homepage: "https://www.cv.no",
    shortName: "CV.no",
    category: "CV-bygger",
    publishedAt: "2026-04-29",
    intro: [
      "CV.no er en av de mest kjente norske CV-byggerne, og leverer rene CV-maler til mennesker som trenger en enkel PDF-CV til en søknad. Søknadsbasen er bygget bredere, som et samlet arbeidsrom for hele jobbsøkingen, ikke bare CV-en.",
      "Denne sammenligningen forklarer ærlig hvor de to verktøyene overlapper, hvor de skiller seg, og hvilket valg som passer for ulike jobbsøkere.",
    ],
    whatItIs: [
      "CV.no er en frittstående CV-bygger med fokus på å produsere én ting godt, en pen og lesbar CV som kan eksporteres til PDF.",
      "Søknadsbasen er en jobbsøker-plattform som inkluderer CV-bygger, AI-assistert søknadsbrev, pipeline med kanban og listevisning, oppgaver og frister, samt innsikt over hvor intervjuene faktisk kommer fra.",
    ],
    comparisonTable: [
      { feature: "CV-bygger med flere maler", soknadsbasen: "8 maler", competitor: "yes" },
      { feature: "PDF-eksport", soknadsbasen: "yes", competitor: "yes" },
      { feature: "ATS-vennlig PDF (tekstlag)", soknadsbasen: "yes", competitor: "partial", note: "Avhenger av valgt mal" },
      { feature: "Søknadsbrev med versjoner", soknadsbasen: "yes", competitor: "no" },
      { feature: "AI-assistert søknadsbrev", soknadsbasen: "yes", competitor: "no" },
      { feature: "Pipeline for søknader", soknadsbasen: "Kanban + liste", competitor: "no" },
      { feature: "Oppgaver og frister", soknadsbasen: "yes", competitor: "no" },
      { feature: "Innsikt og statistikk", soknadsbasen: "yes", competitor: "no" },
      { feature: "Pris (per måned)", soknadsbasen: "79 kr", competitor: "Varierer" },
      { feature: "Gratis prøveperiode", soknadsbasen: "7 dager", competitor: "Begrenset gratis-bruk" },
      { feature: "Datalagring i EU", soknadsbasen: "yes", competitor: "yes" },
      { feature: "Eksporterer alt og eier dataene dine", soknadsbasen: "yes", competitor: "yes" },
    ],
    competitorStrengths: [
      "Etablert merkevare som mange nordmenn allerede kjenner igjen.",
      "Rask onboarding hvis du bare trenger én CV til én konkret søknad.",
      "Lavere terskel hvis du aldri har hatt en CV før og bare vil teste litt.",
    ],
    competitorWeaknesses: [
      "Ingen pipeline for å holde styr på flere søknader, du må selv huske hva som er sendt og når.",
      "Ingen integrert søknadsbrev-modul, det må skrives i Word eller Google Docs separat.",
      "Ingen statistikk eller innsikt over jobbsøkingen din.",
    ],
    soknadsbasenStrengths: [
      "Samlet arbeidsrom for CV, søknadsbrev, pipeline og oppfølging.",
      "AI-assistert søknadsbrev som skrives i kontekst av stillingen, med automatisk versjonshåndtering per arbeidsgiver.",
      "Pipeline med kanban og listevisning for å se hvor du står på tvers av alle søknader.",
      "Innsikt som viser hvor intervjuene faktisk kommer fra, ikke bare hvor mange søknader du har sendt.",
    ],
    whenToChooseCompetitor:
      "Velg CV.no hvis du bare trenger én pen CV til én konkret søknad og ikke planlegger å søke aktivt over tid. For en engangs-søknad er CV.no raskere å komme i gang med.",
    whenToChooseSoknadsbasen:
      "Velg Søknadsbasen hvis du skal søke flere stillinger, vil holde oversikt på tvers, og setter pris på å ha søknadsbrev og CV i samme verktøy. Også et bedre valg hvis du vil ha statistikk og innsikt over tid.",
    faq: [
      {
        q: "Kan jeg ta CV-en fra CV.no inn i Søknadsbasen?",
        a: "Ja, du kan eksportere PDF fra CV.no og laste den opp som referanse, eller skrive inn dataene manuelt i Søknadsbasens CV-bygger. Søknadsbasen oppdager mange felter automatisk fra eksisterende CV-er.",
      },
      {
        q: "Er Søknadsbasen dyrere enn CV.no?",
        a: "Søknadsbasen koster 79 kr per måned eller 299 kr for 6 måneder engangs. CV.no har gratis-tier med begrensninger og betalt for full eksport. Verdien per krone avhenger av om du trenger pipeline og søknadsbrev i tillegg til CV-en.",
      },
      {
        q: "Kan jeg bruke begge?",
        a: "Ja, ingenting hindrer deg. Mange starter med CV.no og bytter til Søknadsbasen når de innser at jobbsøkingen blir uoversiktlig med flere parallelle søknader.",
      },
    ],
  },
  {
    slug: "regneark",
    name: "Regneark (Excel og Google Sheets)",
    shortName: "regneark",
    category: "Manuell tracking",
    publishedAt: "2026-04-29",
    intro: [
      "Mange jobbsøkere starter med et regneark for å holde styr på søknadene sine. Excel eller Google Sheets er gratis, fleksible og kjent. Søknadsbasen ble bygget fordi regneark slutter å fungere når jobbsøkingen blir aktiv og har flere bevegelige deler.",
      "Her er en ærlig sammenligning, når regneark er nok, og når det begynner å skape mer arbeid enn det sparer.",
    ],
    whatItIs: [
      "Et regneark er en åpen, fleksibel tabell der du selv definerer kolonner som arbeidsgiver, stilling, status, søkedato og notater. Kostnad er null hvis du har Excel eller Google-konto.",
      "Søknadsbasen er en spesialbygd plattform med pipeline (kanban + liste), CV-bygger, AI-søknadsbrev og innsikt, alt designet rundt jobbsøkings-flyten.",
    ],
    comparisonTable: [
      { feature: "Pris", soknadsbasen: "79 kr/mnd", competitor: "Gratis" },
      { feature: "Pipeline med kanban", soknadsbasen: "yes", competitor: "no" },
      { feature: "Visuell status-flyt", soknadsbasen: "yes", competitor: "Manuell fargekoding" },
      { feature: "CV-bygger integrert", soknadsbasen: "yes", competitor: "no" },
      { feature: "Søknadsbrev med versjoner", soknadsbasen: "yes", competitor: "no" },
      { feature: "Frister og påminnelser", soknadsbasen: "Auto-varsler", competitor: "Manuell formler" },
      { feature: "Statistikk og innsikt", soknadsbasen: "yes", competitor: "Pivot-tabeller du selv bygger" },
      { feature: "Tilgang fra mobil", soknadsbasen: "yes", competitor: "yes" },
      { feature: "Krever opplæring", soknadsbasen: "Minimal", competitor: "Avhenger av Excel-ferdigheter" },
      { feature: "Skalerer med 50+ søknader", soknadsbasen: "yes", competitor: "Blir tungt" },
    ],
    competitorStrengths: [
      "Helt gratis, og du har det allerede installert eller tilgjengelig.",
      "Maksimal fleksibilitet, du kan definere kolonner og logikk akkurat som du vil.",
      "Du eier filen lokalt eller i Drive, ingenting skjer gjennom tredjepart.",
      "Lav læringskurve hvis du allerede er komfortabel i regneark.",
    ],
    competitorWeaknesses: [
      "Mangler innebygd CV-bygger og søknadsbrev, du må kombinere flere verktøy.",
      "Ingen visuell pipeline-flyt, du ser bare rader, ikke status-stadier.",
      "Påminnelser krever manuelle formler eller eksterne kalender-koblinger.",
      "Statistikk må du bygge selv med pivot-tabeller, det blir tidkrevende ved 20+ søknader.",
      "Filen blir uoversiktlig når du har flere parallelle CV-versjoner og søknadsbrev til ulike stillinger.",
    ],
    soknadsbasenStrengths: [
      "Pipeline-visning som gir umiddelbar oversikt over hvor du står på tvers av alle søknader.",
      "Innebygd CV-bygger med åtte maler og PDF-eksport, ingen behov for separat verktøy.",
      "AI-assistert søknadsbrev med versjoner per arbeidsgiver, ikke flere Word-filer å rote i.",
      "Automatiske påminnelser om intervjuer og frister.",
      "Forhåndsbygd statistikk over respons-rate og hvor intervjuer kommer fra.",
    ],
    whenToChooseCompetitor:
      "Velg regneark hvis du skal søke under fem stillinger totalt, eller hvis du har spesielle krav som er enklere å løse med fleksibel tabell-logikk. Også et godt valg hvis du allerede har en effektiv egen-mal som fungerer for deg.",
    whenToChooseSoknadsbasen:
      "Velg Søknadsbasen hvis jobbsøkingen din er aktiv (10+ søknader på gang), du vil ha CV og søknadsbrev i samme verktøy, eller du har opplevd at regneark-tracking glipper ved at oppfølginger og frister ryker. 79 kr i måneden tjener seg ofte inn på første unngåtte glipp.",
    faq: [
      {
        q: "Kan jeg importere regnearket mitt til Søknadsbasen?",
        a: "Ja, CSV-import er tilgjengelig i pipelinen. Du kan dra ut kolonner fra Excel eller Google Sheets, lagre som CSV og laste opp i Søknadsbasen. Hver rad blir en søknad i pipelinen.",
      },
      {
        q: "Eier jeg fortsatt dataene hvis jeg bytter fra regneark til Søknadsbasen?",
        a: "Ja. Søknadsbasen lar deg eksportere alle dataene tilbake til CSV når som helst. Du kan også eksportere CV-er som PDF, og søknadsbrevene dine forblir i din eierskap.",
      },
      {
        q: "Hvor mange søknader må jeg ha før Søknadsbasen lønner seg?",
        a: "Det er individuelt, men en vanlig terskel er 10 til 15 parallelle søknader. Under det er regneark fortsatt enkelt nok. Over det blir regneark gjerne en byrde, og verdien av en pipeline er stor.",
      },
    ],
  },
];

export function getCompetitorBySlug(slug: string): Competitor | null {
  return COMPETITORS.find((c) => c.slug === slug) ?? null;
}

export function getAllCompetitorSlugs(): string[] {
  return COMPETITORS.map((c) => c.slug);
}
