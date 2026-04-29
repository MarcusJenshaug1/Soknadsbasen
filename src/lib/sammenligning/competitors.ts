// SEO-KONTRAKT: Endring her må synkroniseres med:
// - src/lib/cv-mal/industries.ts
// - src/app/funksjoner/page.tsx (FEATURES-array)
// - src/app/priser/page.tsx (PRICING_FAQ)
// - src/components/pricing/PricingCards.tsx
// - src/lib/seo/jsonld.ts (webApplicationJsonLd)
// - src/lib/seo/siteConfig.ts (pricing)
// - src/app/page.tsx (landing FAQ + funksjons-grid)
// Se AGENTS.md "Sammenligning- og pris-sider er kontrakter".

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
    slug: "lonna",
    name: "Lønna (Jobbe.ai)",
    homepage: "https://lonna.no",
    shortName: "Lønna",
    category: "AI + CV + tracker",
    publishedAt: "2026-04-29",
    intro: [
      "Lønna (markedsført parallelt som Jobbe.ai) er den eneste norske direktekonkurrenten som dekker samme tre-pilars-konsept som Søknadsbasen, CV-bygger, AI-søknadsbrev og søknadstracker. Det gjør dem til den mest sammenlignbare aktøren, og dermed verdt en grundig vurdering.",
      "Denne sammenligningen er basert på hands-on observasjon av begge plattformer i 2026. Vi går gjennom hvor Lønna leverer god verdi, hvor Søknadsbasen skiller seg, og hva du som jobbsøker faktisk får for kronen.",
    ],
    whatItIs: [
      "Lønna er en hybrid-plattform med jobbaggregator (~5 500 til 10 000 stillinger fra NAV/Arbeidsplassen), CV-bygger med 6 maler (Aurora, Bergen, Oslo, Brilliance, Skyline, Horizon), AI-søknadsbrev og lønnsassistent. Plattformen drives av Lønna AS i Oslo og markedsføres parallelt under navnet Jobbe.ai. AI-assistenten heter Lønni.",
      "Søknadsbasen kombinerer 8 CV-maler med 6 fargepaletter og 5 typografisett (240 unike kombinasjoner), AI-assistert søknadsbrev med eksplisitt norsk-konvensjon-prompt, pipeline med kanban + liste + tidslinje, oppgaver og frister, og innsikt med svarrate per kilde og funnel-analyse.",
    ],
    comparisonTable: [
      { feature: "Pris månedlig", soknadsbasen: "79 kr/mnd", competitor: "299 kr/mnd" },
      { feature: "Første måned", soknadsbasen: "Gratis prøve 7 dager", competitor: "89 kr (introduksjon)" },
      { feature: "Total kostnad 6 måneder", soknadsbasen: "299 kr (engangs)", competitor: "1 644 kr (89 + 5×299)" },
      { feature: "Total kostnad 12 måneder", soknadsbasen: "948 kr (mnd) eller 598 kr (2× engangs)", competitor: "2 988 kr (årlig)" },
      { feature: "Engangskjøp", soknadsbasen: "299 kr / 6 mnd full tilgang", competitor: "249 kr / 20 AI-genereringer (~10 brev)" },
      { feature: "Gratis tier", soknadsbasen: "7 dager full prøveperiode", competitor: "3 søknadsbrev, 3 CV-sammendrag, 1 mal" },
      { feature: "CV-mal-kombinasjoner", soknadsbasen: "240 (8 × 6 × 5)", competitor: "6 maler" },
      { feature: "AI-søknadsbrev med norsk konvensjon", soknadsbasen: "yes (eksplisitt prompt)", competitor: "partial", note: "Generisk SaaS-stemme i markedsføring" },
      { feature: "Versjonshåndtering brev", soknadsbasen: "Auto per arbeidsgiver", competitor: "no" },
      { feature: "Pipeline-visninger", soknadsbasen: "Kanban + liste + tidslinje", competitor: "Listevisning" },
      { feature: "ATS-vennlig PDF (Webcruiter, ReachMee)", soknadsbasen: "yes (testet)", competitor: "Ikke verifisert" },
      { feature: "Jobbaggregator inkludert", soknadsbasen: "Kommer (NAV API, kvalitetskuratert)", competitor: "yes (UUID-slug, dårlig SEO)" },
      { feature: "Lønnsassistent", soknadsbasen: "Kommer (SSB åpen data)", competitor: "yes" },
      { feature: "Match Score (CV vs annonse)", soknadsbasen: "yes (gratis)", competitor: "no" },
      { feature: "Innsikt med svarrate per kilde", soknadsbasen: "yes", competitor: "Begrenset" },
      { feature: "Klar merkevare", soknadsbasen: "Søknadsbasen", competitor: "Forvirring (Jobbe.ai/Lønna/Lønni)" },
      { feature: "Datalagring eksplisitt EU", soknadsbasen: "yes (Stockholm)", competitor: "Ikke spesifisert offentlig" },
    ],
    competitorStrengths: [
      "Stillingsdatabase med ~5 500 til 10 000 stillinger fra NAV/Arbeidsplassen er en reell verdi, slipper å åpne Finn separat.",
      "Lønnsassistent og lønnsdata per stilling er en sterk markedsføringsvinkel.",
      "Konsekvent norsk språkdrakt på UI og blogg.",
      "Bredt sosial-fotavtrykk (TikTok, Instagram, YouTube, Facebook, LinkedIn, Snapchat) selv om engasjement er lavt.",
    ],
    competitorWeaknesses: [
      "Pris på 249 til 299 kr per måned er omtrent 3x dyrere enn Søknadsbasen.",
      "Dobbel-merkevare splitter SEO-autoritet og forvirrer brukere: Jobbe.ai (marketingside, fortsatt «© 2024») og Lønna (selve appen).",
      "Kun 6 CV-maler uten farge-/typografi-tilpasning, mot Søknadsbasens 240 kombinasjoner.",
      "Engangskjøp gir kun 20 AI-genereringer (~10 brev), ikke full tilgang.",
      "Stillingssider bruker UUID-slug (/stillinger/<uuid>), dårlig SEO som gir lite long-tail-trafikk.",
      "Generisk SaaS-stemme i markedsføring («Revolusjoner måten du søker jobb på»), tyder på at AI-søknadsbrev også kan ha amerikansk-influenset stemme.",
      "Ingen verifiserbar brukerbase: ingen Trustpilot-side, ingen Reddit-omtaler, ingen presse i E24/DN/Karriere.no.",
      "Testimonials på forsiden bruker stockfoto med flere navn (Martin/Camilla/Julie ved samme bilde), ikke verifiserbare LinkedIn-kunder.",
      "Ingen Chrome-extension, ingen Match Score, ingen native mobilapp.",
    ],
    soknadsbasenStrengths: [
      "Eksplisitt norsk-konvensjons-prompt: maks 350 ord, ingen «begeistret» eller «lidenskapelig», konkrete tall foran adjektiv. Markedsført som «Norsk-modus».",
      "240 unike CV-kombinasjoner (8 maler × 6 fargepaletter × 5 typografisett), mot Lønnas 6 maler.",
      "Match Score som er gratis for alle: Søknadsbasen forklarer hvilke krav fra annonsen du dekker og hvilke som er gap. Lønna har ikke dette i det hele tatt.",
      "Pipeline med kanban + liste + tidslinje, tre visninger for samme data.",
      "Innsiktsmodul med svarrate per kilde (FINN, LinkedIn, Webcruiter, direkte) og funnel-analyse — dypere enn Lønnas markedsførte versjon.",
      "Eksplisitt EU-lagring (Supabase Stockholm), ingen datasalg, dedikert /personvern-og-data-side med arkitekturdiagram.",
      "Klar enkelt-merkevare uten dual-brand-forvirring.",
      "Tydelig prising: 79 kr/mnd eller 299 kr engangs for 6 måneder, ingen 89-til-299-trinn-oppgradering.",
    ],
    whenToChooseCompetitor:
      "Velg Lønna hvis stillingsaggregatoren er hovedgrunnen til at du vurderer et verktøy, og du er villig til å betale 3x for å slippe å åpne Finn og NAV separat. Også et valg hvis du allerede er etablert på plattformen og ikke vil migrere.",
    whenToChooseSoknadsbasen:
      "Velg Søknadsbasen hvis du vil ha CV-byggeren med flest kombinasjoner i Norge, AI-søknadsbrev som faktisk følger norsk konvensjon (ikke amerikansk cover-letter-stil), gratis Match Score som forklarer gap, og tre pipeline-visninger til en tredjedel av prisen. Også sterkt anbefalt hvis du verdsetter klar merkevare og eksplisitt EU-personvern.",
    faq: [
      {
        q: "Hva er forskjellen på Jobbe.ai og Lønna?",
        a: "Det er samme selskap (Lønna AS) med to merkenavn. Jobbe.ai er den utadvendte marketingsiden (fortsatt merket «© 2024»), mens Lonna.no er selve appen. Det skaper forvirring rundt hvilken side du faktisk skal logge inn på, og AI-assistenten heter forresten Lønni.",
      },
      {
        q: "Hvor god er Lønnas AI-søknadsbrev sammenlignet med Søknadsbasen?",
        a: "Lønna oppgir ikke offentlig hvilken AI-modell de bruker, og markedsføringen deres er i generisk SaaS-stemme («Revolusjoner måten du søker jobb på»), som tyder på at AI-output kan slippe igjennom amerikansk-stilte fraser. Søknadsbasen har eksplisitt norsk-konvensjons-prompt: maks 350 ord, ingen klisjéer, konkrete tall i hoveddel, og en validator som flagger forbudte ord før brevet sendes til deg.",
      },
      {
        q: "Hvorfor er Lønna 3x dyrere?",
        a: "Standard månedspris er 299 kr (eller 249 kr/mnd ved årsbetaling), mot Søknadsbasens 79 kr/mnd. Den ekstra prisen går trolig til drift av jobbaggregatoren og lønnsassistenten. Men begge funksjoner er på vei inn i Søknadsbasen til samme 79 kr-pris.",
      },
      {
        q: "Kan jeg flytte CV-er fra Lønna til Søknadsbasen?",
        a: "Ja. Eksporter PDF-en din fra Lønna, last opp som referanse i Søknadsbasen, og bygg om i én av de 8 malene. Søknadsbasen oppdager mange felter automatisk og gir deg flere mal-/farge-/typografi-kombinasjoner enn Lønna har.",
      },
      {
        q: "Hva er Match Score, og har Lønna det også?",
        a: "Match Score er en transparent gjennomgang av hvor godt CV-en din dekker stillingsannonsens krav, med per-krav-status (dekket / delvis / mangler). Lønna har ikke dette i det hele tatt. Søknadsbasen tilbyr funksjonen gratis for alle, også uten Pro-abonnement.",
      },
    ],
  },
  {
    slug: "cvapp-no",
    name: "CVapp.no",
    homepage: "https://www.cvapp.no",
    shortName: "CVapp.no",
    category: "CV-bygger",
    publishedAt: "2026-04-29",
    intro: [
      "CVapp.no er den norske lokaliseringen av Resume.io og CVmaker, drevet av et nederlandsk selskap. Det er en av de mest synlige norske CV-byggerne i Google-søk på 'CV-mal' og 'lag CV', med et stort galleri av profesjonelle maler.",
      "Vi sammenligner ærlig: hvor CVapp.no leverer god verdi, hvor Søknadsbasen tilbyr noe annet, og hvilket valg som faktisk passer til ulike jobbsøkere i 2026.",
    ],
    whatItIs: [
      "CVapp.no er en frittstående CV-bygger med et bredt mal-galleri og PDF-eksport. Selskapet bak driver også Resume.io og CVmaker internasjonalt, og UI-et er lokalisert til norsk. Kundeservice foregår på engelsk.",
      "Søknadsbasen er en samlet jobbsøker-plattform: CV-bygger med 8 maler, AI-assistert søknadsbrev, pipeline for tracking, oppgaver og frister, samt innsikt over jobbsøkingen din.",
    ],
    comparisonTable: [
      { feature: "CV-bygger med flere maler", soknadsbasen: "8 maler", competitor: "yes (mange)" },
      { feature: "PDF-eksport", soknadsbasen: "yes", competitor: "yes" },
      { feature: "ATS-vennlig PDF", soknadsbasen: "yes", competitor: "partial", note: "Avhenger av valgt mal" },
      { feature: "Søknadsbrev integrert", soknadsbasen: "yes (med AI)", competitor: "no", note: "Separat verktøy" },
      { feature: "Pipeline for søknader", soknadsbasen: "Kanban + liste", competitor: "no" },
      { feature: "Innsikt og statistikk", soknadsbasen: "yes", competitor: "no" },
      { feature: "Norsk eier", soknadsbasen: "yes", competitor: "no", note: "Nederlandsk selskap" },
      { feature: "Norsk kundeservice", soknadsbasen: "yes", competitor: "Engelsk" },
      { feature: "Pris", soknadsbasen: "79 kr/mnd", competitor: "Cirka 79 kr/uke som ruller til 299 kr/mnd" },
      { feature: "Tydelig prising", soknadsbasen: "yes", competitor: "Mange Trustpilot-rapporter om uventet trekk" },
      { feature: "Kanseller når som helst", soknadsbasen: "yes", competitor: "yes" },
      { feature: "Datalagring i EU", soknadsbasen: "yes (Stockholm)", competitor: "yes" },
    ],
    competitorStrengths: [
      "Bredt utvalg profesjonelle CV-maler.",
      "Glatt og polert UI med god mobilopplevelse.",
      "Høy SEO-synlighet på CV-mal-relaterte søk.",
      "Etablert internasjonal aktør med stor brukerbase.",
    ],
    competitorWeaknesses: [
      "Ingen integrert søknadsbrev-modul, du må kombinere flere verktøy.",
      "Ingen pipeline eller søknadsoversikt, du må selv huske hva som er sendt.",
      "Prismodellen starter på 79 kr/uke og ruller automatisk til omtrent 299 kr/mnd, mange Trustpilot-anmeldelser klager på uventet belastning (én bruker rapporterer 2 000 kr i samlet trekk).",
      "Kundeservice på engelsk, ikke norsk, og selskapet er nederlandsk-eid.",
    ],
    soknadsbasenStrengths: [
      "Tydelig prising fra dag én: 79 kr per måned eller 299 kr engangs for 6 måneder, uten skjulte ukes-til-måneds-oppgraderinger.",
      "Integrert AI-søknadsbrev med versjonshåndtering per arbeidsgiver, ikke et separat verktøy.",
      "Pipeline med kanban og liste-visning som holder orden på alle parallelle søknader.",
      "Norsk eierskap og norsk kundeservice, ikke oversatt fra engelsk.",
      "Datalagring eksplisitt i EU (Supabase Stockholm), ingen tredjeparts-overføring.",
    ],
    whenToChooseCompetitor:
      "Velg CVapp.no hvis du bare trenger én CV-fil til én konkret søknad og ikke planlegger å spore flere søknader. Også et valg hvis du verdsetter et bredere mal-galleri og er forsiktig med å sette opp kanselleringspåminnelse for å unngå auto-fornyelse.",
    whenToChooseSoknadsbasen:
      "Velg Søknadsbasen hvis du vil ha CV, søknadsbrev og pipeline i samme verktøy, foretrekker norsk eierskap og kundeservice, og setter pris på tydelig prising uten ukes-til-måneds-oppgraderinger eller uventede trekk.",
    faq: [
      {
        q: "Hva slags selskap er CVapp.no egentlig?",
        a: "CVapp.no er den norske lokaliseringen av en internasjonal plattform drevet av et nederlandsk selskap, samme som Resume.io og CVmaker. UI-et er på norsk, men kundeservice og fakturering går gjennom internasjonale enheter.",
      },
      {
        q: "Hvorfor er det så mange klager på CVapp.no på Trustpilot?",
        a: "Hovedklagen er prismodellen: tjenesten markedsføres ofte med 79 kr per uke, men dette ruller automatisk til abonnement på cirka 299 kr per måned hvis du ikke kansellerer aktivt. Flere brukere rapporterer å ha mistet flere tusen kroner før de oppdaget belastningen.",
      },
      {
        q: "Kan jeg flytte CV-en fra CVapp.no til Søknadsbasen?",
        a: "Ja. Eksporter PDF-en fra CVapp.no, last opp i Søknadsbasen som referanse, og bygg om i én av de 8 malene. Søknadsbasen oppdager mange felter automatisk.",
      },
      {
        q: "Er Søknadsbasen dyrere enn CVapp.no over tid?",
        a: "Det avhenger av om du faktisk husker å kansellere CVapp.no før den ruller til full månedspris. Mange brukere ender opp med å betale CVapp.no i flere måneder uten å bruke tjenesten. Søknadsbasens 79 kr per måned er fast og forutsigbart.",
      },
    ],
  },
  {
    slug: "resume-io",
    name: "Resume.io",
    homepage: "https://resume.io",
    shortName: "Resume.io",
    category: "Internasjonal CV-bygger",
    publishedAt: "2026-04-29",
    intro: [
      "Resume.io er en av verdens mest brukte CV-byggere, med polerte maler og maskinlæring som hjelper med formuleringer. Mange norske jobbsøkere har brukt Resume.io på et tidspunkt, særlig studenter og nyutdannede.",
      "Vi sammenligner ærlig: Resume.io er et solid produkt, men det er bygget for det amerikanske markedet. Hvordan står det seg mot en norsk-spesifikk plattform som Søknadsbasen?",
    ],
    whatItIs: [
      "Resume.io er en internasjonal CV-bygger med fokus på det amerikanske og britiske markedet, drevet av Bold Limited. Plattformen tilbyr CV-bygger og separat følgebrev-verktøy, polerte maler, og PDF-eksport. Det finnes en norsk lokalisering (CVapp.no), men kjerne-produktet er bygget for engelsk-språklige markeder.",
      "Søknadsbasen er bygget for det norske markedet fra grunn av: norsk språk og søknadskultur, ATS-tilpasning for norske rekrutterings-systemer (Webcruiter, ReachMee, Workday), og NOK-prising uten valuta-konvertering.",
    ],
    comparisonTable: [
      { feature: "CV-maler", soknadsbasen: "8 maler", competitor: "30+ maler" },
      { feature: "Norsk språk og UI", soknadsbasen: "yes", competitor: "Lokalisering finnes (CVapp.no)" },
      { feature: "ATS-tilpasning for norske systemer", soknadsbasen: "yes", competitor: "no", note: "Optimalisert for amerikanske ATS" },
      { feature: "Norsk søknadsbrev-konvensjon", soknadsbasen: "yes", competitor: "no", note: "Cover letter-fokusert" },
      { feature: "Pipeline for søknader", soknadsbasen: "yes", competitor: "no" },
      { feature: "AI-søknadsbrev integrert", soknadsbasen: "yes", competitor: "Separat verktøy" },
      { feature: "Pris (per måned)", soknadsbasen: "79 kr", competitor: "Cirka 250 kr (24,95 USD)" },
      { feature: "Valuta i fakturering", soknadsbasen: "NOK", competitor: "USD eller EUR" },
      { feature: "Datalagring i EU", soknadsbasen: "yes (Stockholm)", competitor: "Ofte amerikanske servere" },
      { feature: "Kundeservice på norsk", soknadsbasen: "yes", competitor: "Engelsk" },
    ],
    competitorStrengths: [
      "Et av de mest etablerte CV-bygger-merkene globalt, brukt av millioner.",
      "Stort mal-galleri med moderne, polerte design.",
      "Sterk infrastruktur og pålitelig PDF-eksport.",
      "Hyppige produkt-oppdateringer og nye funksjoner.",
    ],
    competitorWeaknesses: [
      "Ikke bygget for norsk søknadskultur, 'cover letter' er ikke det samme som norsk søknadsbrev.",
      "Ingen ATS-tilpasning for Webcruiter, ReachMee, Jobylon eller andre norske rekrutterings-systemer.",
      "Pris i USD eller EUR, ikke NOK, gir valuta-svingning og ofte høyere effektiv kostnad.",
      "Datalagring kan være utenfor EU/EØS, GDPR-status varierer.",
      "Ingen integrert pipeline eller søknads-tracking.",
    ],
    soknadsbasenStrengths: [
      "Norsk språk og UI fra grunn av, ikke oversettelse.",
      "ATS-maler testet mot Webcruiter, ReachMee og andre norske systemer.",
      "Søknadsbrev-modulen følger norsk konvensjon: kort, formell, konkret.",
      "Pipeline for å spore alle søknader på tvers av Finn, NAV, LinkedIn og andre kilder.",
      "NOK-prising uten valuta-svingning, klar 79 kr per måned.",
    ],
    whenToChooseCompetitor:
      "Velg Resume.io hvis du primært søker stillinger i USA, Storbritannia eller andre engelsk-språklige markeder. Også et valg hvis du allerede har en betalt konto og bare trenger å eksportere ut én CV.",
    whenToChooseSoknadsbasen:
      "Velg Søknadsbasen hvis du søker stillinger i Norge, vil ha søknadsbrev som følger norsk konvensjon, og foretrekker NOK-prising. Også sterkt anbefalt hvis du sender flere parallelle søknader og trenger pipeline.",
    faq: [
      {
        q: "Bruker norske arbeidsgivere Resume.io-CV-er?",
        a: "Mange CV-er som lastes opp til norske ATS er bygget på Resume.io eller lignende internasjonale verktøy. De fungerer ofte teknisk, men 'cover letter'-konvensjonen som Resume.io forutsetter, er ikke samme som norsk søknadsbrev. En søknad i amerikansk stil kan virke for selvsikker for en norsk leser.",
      },
      {
        q: "Er Resume.io GDPR-kompatibel for norske brukere?",
        a: "Resume.io oppgir at de følger GDPR, men datalagring er ofte i USA. For norske brukere som vil holde personopplysninger eksplisitt i EU, er Søknadsbasen et tryggere valg (Supabase Stockholm).",
      },
      {
        q: "Kan jeg overføre CV-en min fra Resume.io til Søknadsbasen?",
        a: "Ja. Eksporter CV som PDF fra Resume.io, og last opp som referanse i Søknadsbasen. Søknadsbasen oppdager mange felter automatisk og foreslår oversetting til norsk konvensjon.",
      },
    ],
  },
  {
    slug: "huntr",
    name: "Huntr",
    homepage: "https://huntr.co",
    shortName: "Huntr",
    category: "Pipeline + AI",
    publishedAt: "2026-04-29",
    intro: [
      "Huntr er den mest populære internasjonale jobbsøker-trackeren, særlig blant utviklere og tech-folk. Den har et utmerket kanban-grensesnitt, Chrome-extension som autofyller skjemaer, og innebygd AI for CV og søknadsbrev.",
      "Vi sammenligner ærlig: Huntr er teknisk solid, men er bygget for det amerikanske markedet. Hvordan står det seg mot en norsk-fokusert plattform som Søknadsbasen?",
    ],
    whatItIs: [
      "Huntr er en internasjonal hybrid-plattform med kanban-pipeline, AI CV-bygger, AI-søknadsbrev, Chrome-extension med autofill, og dyp ATS-keyword-matching mot stillingsannonser. UI er på engelsk, og produktet er bygget for amerikansk og britisk arbeidsmarked.",
      "Søknadsbasen er bygget for det norske markedet: norsk språk og UI, norsk søknadsbrev-konvensjon, ATS-maler testet mot Webcruiter og ReachMee, og NOK-prising.",
    ],
    comparisonTable: [
      { feature: "Kanban-pipeline", soknadsbasen: "yes", competitor: "yes (best i klassen)" },
      { feature: "AI CV-bygger", soknadsbasen: "yes (8 maler)", competitor: "yes" },
      { feature: "AI-søknadsbrev", soknadsbasen: "yes", competitor: "yes" },
      { feature: "Chrome-extension med autofill", soknadsbasen: "no", competitor: "yes" },
      { feature: "ATS keyword-matching", soknadsbasen: "yes (norske ATS)", competitor: "yes (US ATS)" },
      { feature: "Norsk språk og UI", soknadsbasen: "yes", competitor: "no" },
      { feature: "Norsk søknadsbrev-konvensjon", soknadsbasen: "yes", competitor: "no" },
      { feature: "Norske ATS-maler (Webcruiter, ReachMee)", soknadsbasen: "yes", competitor: "no" },
      { feature: "Pris (per måned)", soknadsbasen: "79 kr", competitor: "Cirka 100 til 400 kr (10-40 USD)" },
      { feature: "Gratis tier", soknadsbasen: "7 dagers full prøve", competitor: "Opp til 100 jobber gratis" },
      { feature: "Datalagring i EU", soknadsbasen: "yes (Stockholm)", competitor: "no (US)" },
    ],
    competitorStrengths: [
      "Det beste kanban-grensesnittet for jobbsøker-tracking i markedet, raskt og polert.",
      "Chrome-extension som autofyller søknadsskjemaer er et stort tidsbesparende verktøy.",
      "Sterk ATS keyword-matching mot stillingsannonser.",
      "Stor brukerbase og aktivt fellesskap.",
      "Generøs gratis-tier (opp til 100 jobber).",
    ],
    competitorWeaknesses: [
      "Engelsk UI og engelsk søknadsbrev-konvensjon, ikke tilpasset norsk arbeidsmarked.",
      "Ingen norsk lokalisering eller forståelse av Webcruiter, ReachMee eller andre norske ATS.",
      "Pris i USD med valuta-svingning, opp til 400 kr per måned.",
      "Datalagring i USA, ikke optimalt for norsk personvern-bevisste brukere.",
      "Ingen integrasjon mot Finn.no eller andre norske stillings-portaler.",
    ],
    soknadsbasenStrengths: [
      "Norsk språk og UI, ingen oversettelses-rusk.",
      "Søknadsbrev-modul som følger norsk konvensjon (formell, kort, konkret).",
      "ATS-maler testet mot Webcruiter, ReachMee og andre norske rekrutterings-systemer.",
      "NOK-prising på 79 kr per måned, ingen valuta-overraskelser.",
      "Datalagring i EU (Stockholm), GDPR-kompatibel uten kompromiss.",
    ],
    whenToChooseCompetitor:
      "Velg Huntr hvis du søker internasjonale stillinger (USA, UK, andre engelsk-språklige markeder), eller hvis du verdsetter Chrome-extensionen for autofill høyere enn norsk lokalisering. Også et valg hvis du allerede har en etablert workflow på Huntr og søker primært tech-stillinger.",
    whenToChooseSoknadsbasen:
      "Velg Søknadsbasen hvis du søker norske stillinger og vil ha søknader på norsk, foretrekker norsk eierskap og kundeservice, og setter pris på en plattform tilpasset norsk søknadskultur og ATS-systemer.",
    faq: [
      {
        q: "Kan jeg bruke Huntr for norske søknader?",
        a: "Teknisk ja. Du kan tracke norske søknader i Huntr og bruke den engelske AI-en. Men søknadsbrev generert i Huntr er optimalisert for amerikansk konvensjon ('cover letter'), som har annen struktur og tone enn norsk søknadsbrev.",
      },
      {
        q: "Hva er Huntrs Chrome-extension?",
        a: "En extension som autofyller søknadsskjemaer på en rekke jobb-portaler. Sparer mye tid for søkere som søker mange stillinger, men er primært optimalisert for amerikanske ATS-er.",
      },
      {
        q: "Kan jeg overføre data fra Huntr til Søknadsbasen?",
        a: "Ja. Huntr lar deg eksportere data som CSV. Søknadsbasen har CSV-import for pipelinen, så du kan flytte alle eksisterende søknader inn med tre til fem minutters arbeid.",
      },
      {
        q: "Hvilket har bedre AI for søknadsbrev?",
        a: "Begge bruker moderne språkmodeller. Forskjellen er språk og kontekst: Huntrs AI er trent på engelske cover letters, Søknadsbasens AI er finjustert på norsk søknadsbrev-konvensjon.",
      },
    ],
  },
  {
    slug: "finn-cv",
    name: "Finn CV",
    homepage: "https://www.finn.no",
    shortName: "Finn CV",
    category: "Gratis CV i jobb-portal",
    publishedAt: "2026-04-29",
    intro: [
      "Finn er Norges største stillings-marketsplass, og har en innebygd CV-bygger som lar deg lage en jobbprofil og søke direkte med 'Enkel søknad'-knappen. Den er gratis, og brukes av nesten alle norske jobbsøkere på et tidspunkt.",
      "Vi sammenligner ærlig: Finn-CV er et godt utgangspunkt for søknader på Finn-stillinger, men dekker ikke jobbsøkingen din utenfor plattformen. Søknadsbasen utfyller, ikke erstatter.",
    ],
    whatItIs: [
      "Finn CV er en gratis CV-bygger og jobbprofil integrert i Finn.no. Den lar deg fylle ut én profil med erfaring, utdanning og ferdigheter, og bruke 'Enkel søknad' for å sende profilen direkte til Finn-stillinger med ett klikk.",
      "Søknadsbasen er en frittstående jobbsøker-plattform: CV-bygger med 8 maler, AI-søknadsbrev, pipeline for å spore søknader på tvers av Finn, NAV, LinkedIn og direkte arbeidsgiver-portaler, og innsikt over jobbsøkingen din.",
    ],
    comparisonTable: [
      { feature: "Pris", soknadsbasen: "79 kr/mnd", competitor: "Gratis" },
      { feature: "CV-bygger", soknadsbasen: "8 maler", competitor: "1 layout" },
      { feature: "PDF-eksport", soknadsbasen: "yes (8 maler)", competitor: "yes (1 layout)" },
      { feature: "Søknadsbrev integrert", soknadsbasen: "yes (AI)", competitor: "no" },
      { feature: "Pipeline for søknader", soknadsbasen: "yes (kanban)", competitor: "Kun Finn-søknader" },
      { feature: "Spore søknader utenfor Finn", soknadsbasen: "yes", competitor: "no" },
      { feature: "Innsikt på tvers av kanaler", soknadsbasen: "yes", competitor: "no" },
      { feature: "Enkel søknad på Finn-annonser", soknadsbasen: "no", competitor: "yes" },
      { feature: "Stillings-aggregator", soknadsbasen: "no", competitor: "yes (Finn-stillinger)" },
      { feature: "Krever Finn-konto", soknadsbasen: "no", competitor: "yes" },
    ],
    competitorStrengths: [
      "Helt gratis.",
      "Integrert med Norges største stillingsmarketsplass, ett klikk for å søke på Finn-stillinger.",
      "Massiv brukerbase, ble brukt av cirka 2 millioner nordmenn årlig.",
      "Bekvem 'Enkel søknad'-knapp for masse-søking.",
    ],
    competitorWeaknesses: [
      "Bare én CV-layout, ingen mal-variasjon eller designvalg.",
      "Ingen AI-assistanse for søknadsbrev.",
      "Ingen pipeline eller tracking for søknader sendt utenfor Finn.",
      "Du må manuelt huske hvilke stillinger du har søkt på, og hvor du står i prosessen.",
      "Ingen integrasjon med søknader sendt direkte til arbeidsgiver-portaler eller NAV-stillinger.",
    ],
    soknadsbasenStrengths: [
      "Sporer søknader på tvers av Finn, NAV, LinkedIn og direkte arbeidsgiver-portaler i én pipeline.",
      "Genererer søknadsbrev tilpasset hver stilling med AI, ikke bare en standard mal.",
      "8 ulike CV-maler å velge fra, ikke begrenset til én layout.",
      "Innsikt over hvor intervjuer faktisk kommer fra på tvers av alle kanaler.",
      "Eier dataene dine, kan eksporteres når som helst.",
    ],
    whenToChooseCompetitor:
      "Velg Finn CV hvis du primært søker jobber via Finn-stillinger og bare trenger en grunnleggende profil for 'Enkel søknad'-knappen. Det er gratis og fungerer fint for sporadiske jobbsøknader på Finn-plattformen.",
    whenToChooseSoknadsbasen:
      "Velg Søknadsbasen hvis du søker stillinger på flere plattformer (Finn, NAV, LinkedIn, direkte til arbeidsgiver), vil ha en pipeline som fanger alt, og setter pris på AI-søknadsbrev og varierte CV-maler.",
    faq: [
      {
        q: "Kan jeg bruke Finn CV og Søknadsbasen sammen?",
        a: "Ja, mange gjør det. Du kan ha din Finn-profil for 'Enkel søknad' på Finn-stillinger, og Søknadsbasen for større søknader som krever skreddersydd CV og søknadsbrev. Pipelinen i Søknadsbasen kan tracke begge sett med søknader.",
      },
      {
        q: "Hvorfor betale for noe når Finn CV er gratis?",
        a: "Finn CV dekker bare CV-en og kun søknader på Finn-plattformen. Hvis du søker mer enn 5 til 10 stillinger og noen er utenfor Finn, blir tracking uoversiktlig. Søknadsbasen samler alt på ett sted og legger til AI-søknadsbrev som Finn ikke har.",
      },
      {
        q: "Kan jeg overføre Finn-CV-en min til Søknadsbasen?",
        a: "Ja. Eksporter PDF-en fra Finn, last opp som referanse i Søknadsbasen, og bygg om i én av de 8 malene. Søknadsbasen oppdager mange felter automatisk.",
      },
      {
        q: "Kan jeg bruke Søknadsbasen for å søke på Finn-stillinger?",
        a: "Ja, men 'Enkel søknad'-knappen på Finn fungerer kun med Finn-CV. For andre Finn-søknader kan du bruke Søknadsbasens CV (eksportert som PDF) og søknadsbrev, og laste opp manuelt.",
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
