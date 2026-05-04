export type PitchSlideLayout =
  | "cover"
  | "stat-row"
  | "numbered"
  | "bullets"
  | "closing";

export type PitchSlide = {
  id: number;
  layout: PitchSlideLayout;
  eyebrow?: string;
  title: string;
  lede?: string;
  body?: string;
  items?: { label?: string; text: string }[];
  footer?: string;
};

export const NAV_SLIDES: PitchSlide[] = [
  {
    id: 1,
    layout: "cover",
    eyebrow: "Søknadsbasen.no",
    title: "En personlig søknadsassistent for hver norsk arbeidssøker",
    footer: "PILOT-FORSLAG TIL NAV · 4. MAI 2026",
  },
  {
    id: 2,
    layout: "bullets",
    eyebrow: "OM OSS",
    title: "Bygget av en jobbsøker. Drevet fra Norge.",
    items: [
      { text: "Norsk solo-gründer og fullstack-utvikler" },
      { text: "Bygde Søknadsbasen først for å løse mitt eget jobbsøker-problem" },
      { text: "Live i beta — fungerende produkt, ikke et konsept" },
      { text: "100 % norsk eierskap, norsk språk og EU-hostet datalagring" },
      { text: "Klar for å onboarde NAV-pilot innen 30 dager" },
    ],
  },
  {
    id: 3,
    layout: "stat-row",
    eyebrow: "PROBLEMET",
    title: "65 400 ledige. 9 000 i over ett år. +29 % på ett år.",
    body: "Personer med utenlandsk navn får 25 % færre intervjuer. Muslimske menn 65 % færre. AAP-søknader tar 14 uker; opptil to år når sakene henvises tilbake. Riksrevisjonen 2025: NAV har ikke lyktes med å redusere frafall fra arbeidslivet.",
  },
  {
    id: 4,
    layout: "bullets",
    eyebrow: "DAGENS LØSNINGER",
    title: "Dagens verktøy hjelper NAV. Ikke søkeren.",
    items: [
      { text: "NAVs Min CV registrerer strukturerte data for arbeidsgiver-søk, ikke selve søknaden" },
      { text: "Arbeidsplassen.no — KI-funksjoner for arbeidsgivere, ikke for jobbsøkere" },
      { text: "Generisk ChatGPT krever teknisk kunnskap, ingen lagring, ingen norsk kontekst" },
    ],
  },
  {
    id: 5,
    layout: "cover",
    eyebrow: "VISJON",
    title: "Tenk om hver arbeidssøker hadde en personlig søknadsassistent.",
    lede: "Skreddersydd CV på minutter. AI-skrevet søknadsbrev for hver utlysning. Full oversikt over hva du har søkt på, hvor du står, og hva som er neste steg.",
  },
  {
    id: 6,
    layout: "bullets",
    eyebrow: "VÅRT PRODUKT",
    title: "CV, søknadsbrev og pipeline på ett sted.",
    items: [
      { text: "CV-bygger med rolle- og bransjespesifikk tilpasning" },
      { text: "AI-genererte søknadsbrev skreddersydd til hver utlysning" },
      { text: "Pipeline-tracker for alle aktive søknader og oppfølginger" },
      { text: "Norsk språk fra dag 1 — bokmål og nynorsk" },
    ],
  },
  {
    id: 7,
    layout: "stat-row",
    eyebrow: "MARKED",
    title: "Verktøyet NAV-veiledere har — for hver enkelt søker.",
    lede: "Vi vil at hver norsk arbeidssøker skal ha en personlig søknadsassistent.",
    body: "103 100 registrerte arbeidssøkere i mars 2026. 144 000 dagpengemottakere i 2025. Hver av dem trenger samme strukturerte støtte NAV-veilederne tilbyr — bare alltid tilgjengelig, alltid på eget initiativ.",
  },
  {
    id: 8,
    layout: "numbered",
    eyebrow: "STATUS",
    title: "Live beta. Klar for pilot.",
    items: [
      { label: "Status", text: "Live beta, fungerende produkt med aktive brukere" },
      { label: "Plattform", text: "Bygget for norsk marked, norsk språk og norsk regelverk" },
      { label: "Sikkerhet", text: "EU-hostet (Supabase EU), GDPR-klar arkitektur" },
      { label: "Skalerbarhet", text: "1 000 pilotbrukere kan onboardes umiddelbart" },
    ],
  },
  {
    id: 9,
    layout: "bullets",
    eyebrow: "VÅR FORDEL",
    title: "Søknad-først, ikke registrering-først.",
    lede: "Andre verktøy registrerer hva du KAN. Vi hjelper deg formidle det til hver enkelt arbeidsgiver.",
    body: "NAVs Min CV og arbeidsplassen.no bygger strukturerte data for arbeidsgiver-søk — nyttig, men halve jobben. Selve søknaden, det språklige og skreddersydde, er der søkere strever mest. Vi erstatter ikke NAVs verktøy. Vi fyller hullet mellom CV-registrering og innsendt søknad.",
  },
  {
    id: 10,
    layout: "bullets",
    eyebrow: "MEDVIND",
    title: "Bølgene vi rir på.",
    items: [
      { text: "Regjeringens KI-mål — 80 % av offentlig sektor skal bruke KI innen 2025" },
      { text: "Langtidsledighet opp 29 % — etablerte verktøy holder ikke tritt" },
      { text: "Generativ KI har modnet — Skatteetaten kjører allerede pilot" },
    ],
  },
  {
    id: 11,
    layout: "bullets",
    eyebrow: "TIMING",
    title: "Hvorfor NÅ?",
    body: "Hege Nilssen tiltrer som arbeids- og velferdsdirektør 1. juni 2026 — friskt mandat for nye initiativer. Riksrevisjonen 2025–2026 konkluderte at NAV ikke har lyktes med å redusere frafall fra arbeidslivet. KI-forordningen (EØS-relevant) krever risiko-baserte rammer som uansett må implementeres. Generativ KI kostet 10× mer for to år siden; i dag tilgjengelig per bruker per måned. Vinduet er åpent nå.",
  },
  {
    id: 12,
    layout: "bullets",
    eyebrow: "GRÜNDER-MARKED-PASSFORM",
    title: "Hvorfor jeg er rett person.",
    lede: "Marcus Jenshaug — fullstack-utvikler og solo-gründer.",
    body: "Da jeg selv søkte jobber, fant jeg ingen verktøy som kombinerte CV-bygging, søknadstekstlagring og oversikt over hvor jeg hadde søkt. Jeg bygde Søknadsbasen først for meg selv. Så innså jeg at hundre tusen andre nordmenn satt med samme problem hver dag — og at de ofte ikke har ressursene jeg hadde. Jeg vil at det skal være billig og lett tilgjengelig for alle. Det er hele grunnen til at jeg pitcher NAV først, ikke betalende kunder.",
  },
  {
    id: 13,
    layout: "numbered",
    eyebrow: "ASKEN",
    title: "Med 4-måneders pilot — her er hva vi måler:",
    items: [
      { label: "1", text: "1 000 NAV-brukere onboardet via veiledere — full kontroll på fordeling" },
      { label: "2", text: "Sendte søknader per bruker — med Søknadsbasen vs. uten som baseline" },
      { label: "3", text: "Veileder-tidsbesparelse — minutter spart per veiledningstime" },
      { label: "4", text: "Brukertilfredshet (NPS) — målt ved 1 mnd, 2 mnd og pilotslutt" },
    ],
  },
  {
    id: 14,
    layout: "bullets",
    eyebrow: "JURIDISK",
    title: "En siste ting…",
    body: "Piloten koster 0 kr og faller utenfor anskaffelsesregelverket (DFØ-terskel 100 000 kr). Vi tilbyr databehandleravtale, ROS-analyse og DPIA før oppstart, og kan bruke Datatilsynets KI-sandkasse for forhåndsavklaring. Veiledere ser CV og jobbsøker-historikk kun når brukeren aktivt deler — fullt samtykke-basert.",
  },
  {
    id: 15,
    layout: "closing",
    title: "La oss kjøre 1 000-bruker piloten i 4 måneder.",
    items: [
      { label: "Marcus Jenshaug", text: "marcus@jenshaug.no" },
      { label: "Web", text: "soknadsbasen.no" },
    ],
  },
];
