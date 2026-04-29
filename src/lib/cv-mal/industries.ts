export type Industry = {
  slug: string;
  name: string;
  shortName: string;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  recommendedTemplate: string;
  templateReason: string;
  aboutSection: {
    heading: string;
    body: string[];
  };
  keywordsToInclude: string[];
  exampleSummary: string;
  exampleAchievements: string[];
  commonMistakes: string[];
  faq: Array<{ q: string; a: string }>;
  relatedRoles: string[];
};

export const INDUSTRIES: Industry[] = [
  {
    slug: "helse",
    name: "Helse",
    shortName: "helse",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for helse",
    metaDescription:
      "CV-mal for sykepleier, lege, helsefagarbeider og annet helsepersonell i Norge. ATS-vennlig PDF, eksempler og praktiske tips.",
    intro: [
      "En CV i helsesektoren skal vise sertifiseringer, autorisasjoner og praktisk klinisk erfaring i en form som ATS-systemer hos Helse Sør-Øst, Akershus universitetssykehus og kommunale helseforetak håndterer korrekt.",
      "Denne malen er bygget for sykepleiere, leger, helsefagarbeidere, jordmødre og annet autorisert helsepersonell. Den prioriterer autorisasjon, klinisk erfaring og videreutdanning, i den rekkefølgen rekrutterere i sektoren faktisk leter.",
    ],
    recommendedTemplate: "Klassisk én-spalte med tydelig autorisasjons-seksjon",
    templateReason:
      "Helsesektoren bruker ofte interne system med streng tekst-parsing. Klassisk én-spaltet mal med konvensjonelle seksjonsnavn gir høyest treffrate. Visuelle CV-er med kolonner blir ofte feilparset, spesielt på Helsedirektoratets og kommunale søknadsportaler.",
    aboutSection: {
      heading: "Slik bygger du en CV for helsesektoren",
      body: [
        "Start med autorisasjons-seksjonen øverst, rett under kontaktinformasjon. Skriv ut HPR-nummer hvis du er autorisert, og inkluder dato for autorisasjon. Mange søknadsportaler har egne felter for HPR, og rekrutterere sjekker det først.",
        "Klinisk erfaring kommer som hovedseksjon. List avdeling, sykehus eller kommune, periode og type pasient eller behandlingsområde. For hver rolle, beskriv tre til fem konkrete oppgaver eller resultater, ikke bare ansvarsområde.",
        "Videreutdanning, kurs og sertifiseringer er en egen seksjon. Inkluder ALS, BLS, anestesi-sykepleier-utdanning, intensiv-sykepleier-utdanning, jordmor-master, eller andre sertifiseringer som er relevante for stillingen du søker på.",
        "Avslutt med språk og IT-systemer. Helsesektoren bruker DIPS, Gerica, CosDoc, Imatis og andre. Lister du dem konkret, scorer du høyere i ATS-søk.",
      ],
    },
    keywordsToInclude: [
      "Autorisert sykepleier",
      "HPR-nummer",
      "Klinisk erfaring",
      "Pasientbehandling",
      "DIPS",
      "Medikamenthåndtering",
      "ALS / BLS",
      "Tverrfaglig samarbeid",
    ],
    exampleSummary:
      "Autorisert sykepleier med fem års erfaring fra akuttmedisinsk avdeling ved Oslo universitetssykehus. ALS- og BLS-sertifisert, med spesialkompetanse innen triage og initial-behandling. Søker stilling der jeg kan kombinere klinisk arbeid med veiledning av nyutdannede.",
    exampleAchievements: [
      "Triagerte i gjennomsnitt 30 pasienter per vakt med under 3 minutter ventetid på initial vurdering.",
      "Underviste 12 nyutdannede sykepleiere i triage-prosedyrer over 18 måneder, alle besto kompetanse-vurderingen.",
      "Bidro til implementering av ny dokumentasjonsmal i DIPS som reduserte feilregistrering med 24 prosent.",
      "Mottok pasientpris for service-kvalitet i 2024 etter avstemning blant pasienter og pårørende.",
    ],
    commonMistakes: [
      "Glemme HPR-nummer eller autorisasjons-dato. Rekrutterere bruker ofte HPR-feltet for første filtrering.",
      "Skrive 'sykepleier' uten å spesifisere avdeling eller spesialfelt. 'Sykepleier ved kirurgisk avdeling' gir 50 prosent mer ATS-treff enn bare 'sykepleier'.",
      "Hoppe over IT-systemer. DIPS-erfaring er etterspurt og bør stå i ferdighetsseksjonen.",
      "Lange beskrivelser uten tall. 'Ansvar for medikamenthåndtering' sier mindre enn 'Forvaltet medikamentlager til 40-sengs avdeling med null avvik på revisjon'.",
    ],
    relatedRoles: [
      "Sykepleier",
      "Spesialsykepleier",
      "Helsefagarbeider",
      "Lege",
      "Jordmor",
      "Bioingeniør",
      "Vernepleier",
      "Fysioterapeut",
    ],
    faq: [
      {
        q: "Må jeg ha med HPR-nummer i CV-en?",
        a: "Hvis du er autorisert helsepersonell, ja. HPR-nummeret bekrefter autorisasjonen og lar arbeidsgiver verifisere via Helsepersonellregisteret. Skriv det i kontaktinformasjonen eller i autorisasjons-seksjonen øverst.",
      },
      {
        q: "Hva med vakter og turnus i CV-en?",
        a: "Du trenger ikke detaljere vakt-typer, men nevn 'tre-delt turnus' eller 'helg- og helligdagsturnus' hvis det er relevant for stillingen. Det viser at du kjenner arbeidsformen i sektoren.",
      },
      {
        q: "Skal jeg ha med pasientantall eller avdelings-størrelse?",
        a: "Ja, hvis tallene er konkrete. 'Sykepleier ved 24-sengs medisinsk avdeling med 200 daglige pasientkontakter' gir mer kontekst enn bare 'sykepleier ved medisinsk avdeling'.",
      },
    ],
  },
  {
    slug: "it",
    name: "IT og utvikling",
    shortName: "IT",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for IT og utvikler",
    metaDescription:
      "CV-mal for utviklere, devops-ingeniører og sysadminer i Norge. Tech-stack, GitHub og produksjons-erfaring i ATS-vennlig format.",
    intro: [
      "En IT-CV må vise tech-stack, produksjons-erfaring og konkrete prosjekter. Norske rekrutterere innen utvikling bruker ofte LinkedIn og spesialiserte plattformer som Stack Overflow Talent og Tech Recruiter, og henter CV-er som leses av ATS før et menneske ser dem.",
      "Denne malen er bygget for fullstack-utviklere, frontend-, backend- og platform-ingeniører, devops, datascientists og lignende roller. Den prioriterer tech-stack, prosjekter og resultater i den rekkefølgen tekniske rekrutterere leter.",
    ],
    recommendedTemplate: "Tech-fokusert mal med dedikert tech-stack-seksjon",
    templateReason:
      "Tekniske rekrutterere skanner først etter tech-stack-match (React, TypeScript, Kubernetes, etc.) før de leser detaljer. En CV med tech-stack-seksjon høyt og keyword-rik prosjekt-beskrivelse gir best ATS-resultat. Unngå designet personality-CV, det er en negativ signal i tech.",
    aboutSection: {
      heading: "Slik bygger du en CV for IT og utvikling",
      body: [
        "Start med en tech-stack-seksjon rett under sammendrag. List alle teknologier du kan og har brukt i produksjon, ikke bare det du har lært på kurs. Skill mellom kjerne-stack og 'kjent med'.",
        "For hver rolle: list tech-stacken brukt, beskriv produktet eller systemet (ikke bare 'utvikler hos X'), og lever to til fire konkrete resultater. 'Bygde betalingsmodul som håndterer 1.2 millioner transaksjoner per uke' slår 'jobbet med betalinger'.",
        "Inkluder GitHub-profil, personlig nettside og eventuell portfolio som klikkbare lenker i topp-seksjonen. Tekniske rekrutterere klikker på dem oftere enn på CV-en selv.",
        "Side-prosjekter teller, men hold dem korte og relevante. En to-linjers beskrivelse av en aktiv åpen-kildekode-bidrag eller pet-prosjekt er nok.",
      ],
    },
    keywordsToInclude: [
      "TypeScript",
      "React",
      "Node.js",
      "Postgres",
      "Kubernetes",
      "AWS / Azure / GCP",
      "CI/CD",
      "Test-driven development",
      "Mikrotjenester",
      "Distributed systems",
    ],
    exampleSummary:
      "Fullstack-utvikler med syv års erfaring fra norske startups og scale-ups, hovedsakelig TypeScript og React på frontend, Node.js og Postgres på backend. Har bygget betalings-, autentiserings- og rapporterings-systemer i produksjon med trafikk fra 10 000 til 2 millioner brukere.",
    exampleAchievements: [
      "Reduserte API-respons-tid fra 850ms til 120ms ved omskriving til Node.js og Postgres connection pooling.",
      "Designet og implementerte et abonnement-system med Stripe som behandlet 4.2 millioner kroner i sin første driftsmåned.",
      "Migrerte 14 mikrotjenester fra ECS til Kubernetes uten downtime, reduserte hosting-kostnader med 38 prosent.",
      "Mentorerte to junior-utviklere fra onboarding til selvstendig levering, begge ble forfremmet innen 18 måneder.",
    ],
    commonMistakes: [
      "Lang liste med 'Worked with X, Y, Z' uten å vise dybde. Bedre å si 'Bygde produksjons-system i Kubernetes' enn 'kjent med Kubernetes'.",
      "Glemme produksjons-kontekst. Tech-stack uten skala (brukere, requests, datavolum) er mindre overbevisende.",
      "Designet CV med to kolonner og fancy ikoner. Tech-rekrutterere foretrekker rent og lesbart, og to-spalter feiler oftere i ATS.",
      "Hopper over GitHub-lenke. Det er den ene tingen tekniske intervjuere alltid sjekker.",
    ],
    relatedRoles: [
      "Fullstack-utvikler",
      "Frontend-utvikler",
      "Backend-utvikler",
      "Platform engineer",
      "DevOps-ingeniør",
      "Data engineer",
      "ML engineer",
      "Tech lead",
    ],
    faq: [
      {
        q: "Hvor mye plass skal tech-stacken ta?",
        a: "Mellom en tredjedel og halvparten av første side hvis du er utvikler. Det er den seksjonen tekniske rekrutterere skanner først.",
      },
      {
        q: "Bør jeg liste pet-prosjekter?",
        a: "Bare hvis de er relevante for stillingen og du kan vise faktisk bidrag. Et halvferdig pet-prosjekt skader mer enn det hjelper.",
      },
      {
        q: "Skal jeg ha med karaktersnitt fra utdanning?",
        a: "For roller med over fem års erfaring, nei. For nyutdannede, ja, hvis det er over 4.0 (eller A til B). Ellers, hopp over.",
      },
    ],
  },
  {
    slug: "undervisning",
    name: "Undervisning",
    shortName: "undervisning",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for lærer og undervisning",
    metaDescription:
      "CV-mal for lærere, lektorer og pedagoger i Norge. Pedagogisk kompetanse, fagbakgrunn og praksis i ATS-vennlig format.",
    intro: [
      "Lærer-CV i Norge skal vise pedagogisk utdanning, fag-kombinasjoner og praksis-erfaring fra konkrete trinn og fagområder. Kommunale skoler og fylkeskommunale videregående bruker WebCruiter og ReachMee, som krever klare seksjoner for å skåre korrekt.",
      "Denne malen er for lærere på barne-, ungdoms- og videregående trinn, lektorer, pedagoger og spesialpedagoger. Den prioriterer pedagogisk kompetanse, fag og trinn i den rekkefølgen rektorer og kommunale rekrutterere leser.",
    ],
    recommendedTemplate: "Klassisk én-spalte med tydelig fag- og trinn-seksjon",
    templateReason:
      "Pedagogiske rekrutterere bruker ATS for å filtrere på trinn (1.-7., 8.-10., VGS) og fag-kombinasjoner. Klassisk struktur med eksplisitte 'trinn' og 'fag'-seksjoner gir høyest match-rate.",
    aboutSection: {
      heading: "Slik bygger du en CV for undervisning",
      body: [
        "Lag en utdanning-seksjon som spesifiserer pedagogisk kompetanse eksplisitt. 'Lektor med master i nordisk språk og litteratur, PPU fra UiO 2020' er bedre enn bare 'master i nordisk'.",
        "Spesifiser fag og trinn for hver rolle. 'Lærer i norsk og samfunnsfag på 8. til 10. trinn' er konkret, 'lærer ved skolen' er ikke.",
        "Inkluder praktiske resultater der mulig. Klassemiljø-arbeid, prosjekt-ledelse, fagovergripende prosjekter, foreldre-samarbeid og digitalisering teller.",
        "Pedagogisk filosofi i en kort sammendrag-seksjon (3-4 setninger) hjelper rektorer å se kulturell match.",
      ],
    },
    keywordsToInclude: [
      "Pedagogisk utdanning",
      "PPU",
      "Lektor",
      "Trinn 1.-7. / 8.-10. / VGS",
      "Klasseledelse",
      "Tverrfaglige prosjekter",
      "Vurdering for læring",
      "Tilpasset opplæring",
      "IKT i undervisning",
    ],
    exampleSummary:
      "Lektor med master i nordisk språk og litteratur og PPU fra UiO. Fem års erfaring som norsk- og samfunnsfagslærer på ungdomstrinnet, med spesialinteresse for fagovergripende prosjekter og digital didaktikk.",
    exampleAchievements: [
      "Utviklet og gjennomførte fagovergripende prosjekt om klimaendringer på tvers av norsk, samfunnsfag og naturfag for tre 9.-trinns-klasser.",
      "Implementerte vurdering for læring som standard-praksis på trinnet, dokumentert økning i elev-engasjement i halvårs-evaluering.",
      "Veiledet 4 nyutdannede lærere gjennom det første yrkesåret som mentor i kommunens nyutdannet-program.",
      "Mottok foreldre-pris for klassemiljø-arbeid i 2024 etter avstemning blant foreldre på trinnet.",
    ],
    commonMistakes: [
      "Bare skrive 'lærer' uten trinn og fag. ATS filtrerer eksplisitt på dette.",
      "Glemme PPU eller praktisk-pedagogisk utdanning. Det er obligatorisk for fast stilling i de fleste kommuner.",
      "Skrive lange ansvars-beskrivelser uten konkrete prosjekter eller resultater.",
      "Hoppe over digital didaktikk. Etter Korona-perioden er IKT-erfaring forventet.",
    ],
    relatedRoles: [
      "Lærer 1.-7. trinn",
      "Lærer 8.-10. trinn",
      "Lektor VGS",
      "Spesialpedagog",
      "Pedagogisk leder",
      "Rektor",
      "Inspektør",
      "PPT-rådgiver",
    ],
    faq: [
      {
        q: "Skal jeg ha med praksisperioder fra utdanningen?",
        a: "Ja, hvis du er ny eller har under to års arbeidserfaring. List skole, trinn og varighet. For mer erfarne, hopp over praksis og fokuser på faste roller.",
      },
      {
        q: "Hva med korte vikariater?",
        a: "List dem samlet hvis de er kortere enn én måned ('Vikariater i Oslo og Bærum kommune 2022 til 2024'), eller individuelt hvis de var lengre enn ett semester.",
      },
      {
        q: "Skal politiattest nevnes?",
        a: "Ikke i CV-en, men nevn at den er gyldig eller kan fremlegges i søknadsbrevet. Skoler krever den uansett ved ansettelse.",
      },
    ],
  },
  {
    slug: "bygg",
    name: "Bygg og anlegg",
    shortName: "bygg og anlegg",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for bygg og anlegg",
    metaDescription:
      "CV-mal for snekkere, elektrikere, ingeniører og prosjektledere i bygg og anlegg. Sertifiseringer, prosjekter og HMS i ATS-vennlig format.",
    intro: [
      "CV i bygg og anlegg skal vise fagbrev, sertifiseringer (HMS, kran, varme arbeider) og konkrete prosjekter med skala og rolle. Større entreprenører som Veidekke, AF Gruppen, Skanska og Kruse Smith bruker ATS som filtrerer på fagbrev og sertifiseringer først.",
      "Denne malen er bygget for snekkere, tømrere, elektrikere, rørleggere, anleggsmaskinførere, prosjektledere og ingeniører i bygg og anlegg. Den prioriterer sertifikater, prosjekter og HMS i den rekkefølgen rekrutterere i sektoren leter.",
    ],
    recommendedTemplate: "Klassisk mal med sertifiseringer og prosjektliste",
    templateReason:
      "Bygg-rekrutterere skanner først etter fagbrev, HMS-kort og spesialsertifiseringer. En CV med tydelig sertifiserings-seksjon og prosjektliste i kronologisk orden gir best match. Unngå design-tunge maler, sektoren foretrekker rett-på-sak.",
    aboutSection: {
      heading: "Slik bygger du en CV for bygg og anlegg",
      body: [
        "Sertifiserings-seksjonen er kritisk. List fagbrev (med dato og sted), HMS-kort, varme arbeider, fallsikring, sakkyndig kontroll, kran-sertifikat, truck og andre relevante sertifiseringer med utløpsdato.",
        "Prosjektliste med skala. For hvert prosjekt: navn, oppdragsgiver, periode, kontraktsverdi (hvis kjent eller offentlig), din rolle og to til tre konkrete resultater.",
        "HMS-historikk er en konkurransefordel. Null skader, antall HMS-runder, eller deltakelse i HMS-utvalg er verdt å nevne hvis du har tallene.",
        "Maskin- og verktøyspesifikasjon hvis du er fagarbeider. List konkrete maskiner og typer arbeid du har utført med dem.",
      ],
    },
    keywordsToInclude: [
      "Fagbrev",
      "HMS-kort",
      "Varme arbeider",
      "Fallsikring",
      "Sakkyndig kontroll",
      "Kran-sertifikat",
      "Anbud",
      "Byggeplass-koordinering",
      "TEK17",
      "NS 8405 / NS 8407",
    ],
    exampleSummary:
      "Tømrer med fagbrev fra 2015 og åtte års erfaring fra bolig- og næringsbygg. Erfaring som bas på prosjekter opp til 80 millioner kroner. HMS-kort, varme arbeider, fallsikring og sakkyndig kontroll. Søker rolle som formann eller bas i Oslo-området.",
    exampleAchievements: [
      "Bas på leilighetsprosjekt med 42 enheter og 80 millioner i totalkostnad, leverte uten forsinkelser og innenfor budsjett.",
      "Førte HMS-runder ukentlig på prosjektet i 14 måneder, null fraværsskader og null materielle skader rapportert.",
      "Mentorerte 3 lærlinger gjennom svenneprøve, alle bestod på første forsøk.",
      "Implementerte ny prosjekt-app for løpende avvik-rapportering som reduserte rapporterings-tid med 40 prosent.",
    ],
    commonMistakes: [
      "Glemme HMS-kort eller utløpsdato. Det er det første rekrutterere sjekker.",
      "List prosjekter uten skala. 'Bygget hus' sier mindre enn '12-leiligheters bygg, 24 millioner i totalkostnad, bas-rolle'.",
      "Hoppe over varme arbeider eller fallsikring hvis du har det. Det er kvalifiseringsfilter for mange stillinger.",
      "Skrive 'jobbet i bygg' uten konkret rolle (snekker, bas, formann, prosjektleder). Roller har klare lønns- og ansvars-implikasjoner.",
    ],
    relatedRoles: [
      "Tømrer",
      "Snekker",
      "Elektriker",
      "Rørlegger",
      "Anleggsmaskinfører",
      "Bas",
      "Formann",
      "Prosjektleder bygg",
      "Byggleder",
      "Anbudsingeniør",
    ],
    faq: [
      {
        q: "Hvor lang skal CV-en være for fagarbeider?",
        a: "Én side hvis du har under 10 års erfaring, to sider hvis du har lengre. Sertifiseringer og prosjekter tar plass og er viktigst, ikke tett opp om hobbier.",
      },
      {
        q: "Skal jeg ha med små jobber og enkeltoppdrag?",
        a: "Slå dem sammen i en samleseksjon hvis de er korte. 'Diverse oppdrag som selvstendig tømrer 2018 til 2020' er nok detalj.",
      },
      {
        q: "Hva med utenlandsk arbeidserfaring?",
        a: "List den hvis den er relevant. Norske entreprenører verdsetter ofte erfaring fra Sverige eller Danmark, og IFE-prosjekter telles høyt for ingeniører.",
      },
    ],
  },
  {
    slug: "salg",
    name: "Salg",
    shortName: "salg",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for salg",
    metaDescription:
      "CV-mal for selgere, key account manager og salgssjefer i Norge. Konkrete tall, kvoter og kunder i ATS-vennlig format.",
    intro: [
      "Salgs-CV må vise tall. Quota-attainment, deal-size, conversion-rate og porteføljevekst er det rekrutterere innen salg leter etter. Generiske påstander om 'gode resultater' uten tall er nesten verre enn ingen påstand.",
      "Denne malen er for B2B- og B2C-selgere, key account manager, salgsledere og sales operations-roller. Den prioriterer kvantifiserbare resultater foran ansvar.",
    ],
    recommendedTemplate: "Resultat-fokusert mal med tall i hver bullet",
    templateReason:
      "Salgs-rekrutterere skanner CV-en etter tall først. En mal med plass for konkrete prosenter, beløp og forhold i hver bullet gir umiddelbart troverdighet. Designet mal med ikoner og kolonner er overflødig.",
    aboutSection: {
      heading: "Slik bygger du en CV for salg",
      body: [
        "Sammendrags-seksjonen skal inneholde to til tre tall som umiddelbart etablerer profilen din. 'Konsekvent over kvota i 4 av 5 år, gjennomsnittlig 118 prosent attainment' er konkret.",
        "For hver rolle: kvota-størrelse, antall kunder eller deals, gjennomsnittlig deal-size, conversion-rate. Hvis du har vunnet store kontrakter med navngitte kunder, og det ikke er konfidensielt, nevn dem.",
        "Inkluder verktøy: HubSpot, Salesforce, Pipedrive, ActiveCampaign, LinkedIn Sales Navigator. Salgs-rekrutterere filtrerer på CRM-erfaring.",
        "Hvis du har erfaring med både inbound og outbound, spesifiser fordeling. 'Bygde outbound-pipeline fra null til 1.4 millioner i ARR over 8 måneder' er sterkere enn 'erfaring med outbound'.",
      ],
    },
    keywordsToInclude: [
      "Quota / kvota",
      "Pipeline",
      "ARR / MRR",
      "Conversion rate",
      "Deal size",
      "Outbound / Inbound",
      "Key account",
      "B2B / B2C",
      "HubSpot / Salesforce",
      "Forhandling",
    ],
    exampleSummary:
      "B2B-selger med åtte års erfaring fra SaaS og tjenestesalg, hovedsakelig key account-segment med ARR per kunde fra 200 000 til 4 millioner. Gjennomsnittlig 118 prosent quota-attainment over fem år, med spesialitet i outbound-utvikling og lange salgsykluser (6 til 18 måneder).",
    exampleAchievements: [
      "Solgte SaaS-løsning til Telenor og DNB i 2024, samlet kontraktsverdi 6.2 millioner over 3-årsavtaler.",
      "Bygde outbound-funksjon fra null til 47 prosent av total pipeline over 14 måneder, redusert avhengighet av marketing-leads.",
      "Forhandlet ned churn med 32 prosent på key account-portefølje gjennom kvartalsvise verdi-reviews.",
      "Mentorerte to nye selgere fra ramp-up til kvota-oppnåelse innen syv måneder, vs. team-snitt på 11.",
    ],
    commonMistakes: [
      "Skrive 'gode salgsresultater' uten tall. Det er useriøst i salgs-rekruttering.",
      "Ikke spesifisere segment (SMB, mid-market, enterprise) eller deal-size. Profilen din leses helt ulikt.",
      "Hopper over CRM-verktøy. Salesforce-erfaring er ofte hard kvalifisering.",
      "Nevner kunder som NDA dekker. Ikke navngi kunder hvis salget er konfidensielt.",
    ],
    relatedRoles: [
      "B2B-selger",
      "Key Account Manager",
      "Sales Development Representative",
      "Account Executive",
      "Salgssjef",
      "Sales Operations",
      "Customer Success Manager",
      "Business Development",
    ],
    faq: [
      {
        q: "Hva hvis jeg ikke når kvota?",
        a: "Vær ærlig. 'Nådde 87 prosent av kvota i 2023 etter at hovedmarkedet ble nedjustert' er bedre enn å skjule det. Rekrutterere krysssjekker, og ærlighet om markedet er positivt.",
      },
      {
        q: "Kan jeg liste kunder?",
        a: "Ja, hvis det ikke bryter NDA. List ut konkrete navn (DNB, Telenor, Aker BP) for å vise senioritet på account-nivå.",
      },
      {
        q: "Bør jeg ha med personlighetstester eller DISC?",
        a: "Bare hvis det er forventet i søknaden. Generelt nei, det tar plass og gir lite ekstra signal til en god salgssjef.",
      },
    ],
  },
  {
    slug: "okonomi",
    name: "Økonomi og regnskap",
    shortName: "økonomi",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for økonomi og regnskap",
    metaDescription:
      "CV-mal for regnskapsmedarbeidere, controller og økonomisjefer i Norge. Sertifiseringer, systemer og rapportering i ATS-vennlig format.",
    intro: [
      "Økonomi-CV skal vise sertifiseringer (autorisert regnskapsfører, statsautorisert revisor), erfaring fra konkrete systemer (SAP, Visma, Xledger, PowerOffice) og spesifikke ansvarsområder som månedsavslutning, konsolidering eller MVA-rapportering.",
      "Denne malen er for regnskapsmedarbeidere, controllere, økonomisjefer, financial analyst-roller og revisorer. Den prioriterer sertifiseringer, system-erfaring og rapporterings-kjeden i den rekkefølgen rekrutterere ser etter.",
    ],
    recommendedTemplate: "Klassisk mal med tydelig sertifiserings- og system-seksjon",
    templateReason:
      "Økonomi-rekrutterere skanner ATS for autorisert regnskapsfører-status og spesifikke systemer. En CV med eksplisitte 'Sertifiseringer' og 'Systemer'-seksjoner i topp gir høyest match-rate. Unngå designet CV, sektoren forventer presisjon, ikke kreativitet.",
    aboutSection: {
      heading: "Slik bygger du en CV for økonomi",
      body: [
        "Sertifiserings-seksjonen øverst. Autorisert regnskapsfører (med autorisasjons-dato), bachelor i regnskap, master i revisjon, statsautorisert revisor eller siviløkonom. Disse er kvalifiseringsfilter.",
        "System-erfaring som egen seksjon. List konkrete versjoner og moduler. 'SAP S/4HANA, FI-modul' er bedre enn 'SAP'. 'Visma Business 16.0, lønn og rapportering' er bedre enn 'Visma'.",
        "For hver rolle: ansvarsområde (månedsavslutning, konsolidering, MVA, lønn, betalinger), volum (omsetning, antall transaksjoner, antall ansatte) og rapporterings-kjede (hvem du rapporterte til, hvem du rapporterte for).",
        "Konkrete resultater: cash-management-forbedringer, system-implementeringer, audit-resultater, kostnads-reduksjoner. Tall der mulig.",
      ],
    },
    keywordsToInclude: [
      "Autorisert regnskapsfører",
      "Statsautorisert revisor",
      "Månedsavslutning",
      "Konsolidering",
      "MVA-rapportering",
      "SAF-T",
      "IFRS",
      "Norske GAAP",
      "SAP / Visma / Xledger / PowerOffice",
      "Internkontroll",
    ],
    exampleSummary:
      "Autorisert regnskapsfører med 11 års erfaring fra SMB- og mellomstore selskaper opp til 800 millioner i omsetning. Spesialitet i måneds- og årsavslutning, MVA-kompleks og system-implementeringer. Erfaren i SAP, Visma og Xledger, samt overgang fra norsk GAAP til IFRS.",
    exampleAchievements: [
      "Ledet implementering av Xledger ved konsernovergang fra Visma, 7 selskaper migrert uten regnskaps-avbrudd over 4 måneder.",
      "Reduserte månedsavslutnings-tid fra 9 til 4 dager gjennom prosess-omlegging og automatisert avstemming i SAP S/4HANA.",
      "Konsoliderte 12-selskaps-konsern til kvartalsvis IFRS-rapportering, ren revisjons-rapport tre år på rad.",
      "Implementerte SAF-T-rapportering for konsernet før myndighets-fristen, sparte estimerte 240 timer årlig manuelt arbeid.",
    ],
    commonMistakes: [
      "Glemme autorisert regnskapsfører-status med dato. Det er ofte hard kvalifiseringsfilter.",
      "Skrive 'erfaring med SAP' uten å spesifisere modul. FI, CO, MM og SD er ulike erfarings-områder.",
      "Hoppe over volum-metrics. 'Erfaring med månedsavslutning' sier lite uten 'for konsern på 800 millioner i omsetning og 12 datterselskap'.",
      "Bruke design-CV med kolonner. Økonomi-rekrutterere foretrekker rett, kjedelig og lesbart.",
    ],
    relatedRoles: [
      "Regnskapsmedarbeider",
      "Hovedbokfører",
      "Controller",
      "Financial Analyst",
      "Økonomisjef",
      "CFO",
      "Revisor",
      "Statsautorisert revisor",
      "Konsernregnskapsfører",
    ],
    faq: [
      {
        q: "Skal jeg ha med karaktersnitt fra utdanning?",
        a: "Ja, hvis du har under fem års arbeidserfaring og snittet er over 4.0 (eller A til B). Ellers, hopp over.",
      },
      {
        q: "Hva med kurs og videreutdanning?",
        a: "List relevante kurs som NRS Bedrift, IFRS-kurs eller spesifikke system-sertifiseringer. Hopp over generiske ledelseskurs som ikke er økonomi-spesifikke.",
      },
      {
        q: "Skal jeg liste alle selskaper jeg har vært revisor for?",
        a: "Hvis du er revisor: nevn de største og mest komplekse oppdragene, ikke alle. NDA gjelder uansett, så hold det generelt nok.",
      },
    ],
  },
  {
    slug: "design",
    name: "Design",
    shortName: "design",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for designer",
    metaDescription:
      "CV-mal for UX-, UI- og grafiske designere i Norge. Portfolio-lenke, prosess og resultat i ATS-vennlig format.",
    intro: [
      "Designer-CV er litt spesiell. Selve CV-en må fortsatt være ATS-vennlig, men portfolioen er det som faktisk får deg til intervju. CV-en skal være rent og ryddig (det viser også design-sans), og lede leseren til portfolioen umiddelbart.",
      "Denne malen er for UX/UI-designere, grafiske designere, produktdesignere, industri-designere og motion-designere. Den prioriterer portfolio-lenke, prosess og prosjekter foran tradisjonell CV-struktur.",
    ],
    recommendedTemplate: "Minimal én-spalte med tydelig portfolio-lenke i topp",
    templateReason:
      "Design-rekrutterere klikker på portfolioen før de leser CV-en. CV-en må være lesbar i ATS men også fungere som en kort introduksjon til portfolioen. Ironi er at en pen, designet CV ofte feiler i ATS, og minimal én-spalte med god typografi viser bedre design-modenhet.",
    aboutSection: {
      heading: "Slik bygger du en CV for design",
      body: [
        "Portfolio-lenken må være øverst, klikkbar og umulig å overse. 'Portfolio: behance.net/dittnavn' eller egen domene som dittnavn.no.",
        "Sammendrag-seksjon: 3 til 4 setninger som forteller hva du designer, hva som skiller arbeidet ditt, og hvilke verktøy du behersker.",
        "For hver rolle: produkt eller tjeneste du designet, brukervolum eller skala, din rolle (lead designer, UX, UI, mid-level), og to til tre konkrete prosjekter med utfall.",
        "Verktøy-seksjon: Figma, Sketch, Adobe XD, Adobe Creative Suite, Webflow, Framer, Principle. Designsystem-erfaring (Material, IBM Carbon, egne systemer) er sterk.",
        "Hopp over ikoner og fancy formgivning i CV-en. Portfolioen er der det skjer.",
      ],
    },
    keywordsToInclude: [
      "UX-design",
      "UI-design",
      "Brukertesting",
      "Wireframing",
      "Prototyping",
      "Designsystem",
      "Figma / Sketch",
      "Adobe Creative Suite",
      "Brukerintervju",
      "Information architecture",
    ],
    exampleSummary:
      "UX-designer med seks års erfaring fra norske SaaS og e-handel, spesialitet i komplekse B2B-grensesnitt og designsystem-skalering. Bygd designsystem brukt av 14 produkter og over 200 utviklere. Figma, brukertesting og prosess-fasilitering er kjerne-verktøyene.",
    exampleAchievements: [
      "Ledet redesign av onboarding-flyt for B2B SaaS, reduserte time-to-first-value fra 14 dager til 3, dokumentert i før- og etter-data fra 3000 nye kunder.",
      "Bygde designsystem fra null til komplett komponent-bibliotek i Figma, brukt av 14 produkter på tvers av selskapet.",
      "Fasilitete 26 brukerintervjuer på tre måneder for å validere ny produkt-strategi, funn dannet beslutningsgrunnlag for prioritering.",
      "Mentorerte 3 junior-designere gjennom designsystem-onboarding og portfolio-utvikling.",
    ],
    commonMistakes: [
      "Designet CV med kolonner og ikoner. Den feiler i ATS og signaliserer paradoksalt nok dårlig design-modenhet.",
      "Glemme portfolio-lenke. Det er det viktigste enkeltelementet i en designer-CV.",
      "Skrive 'designer hos X' uten å beskrive hva, for hvem og med hvilket utfall.",
      "Hoppe over verktøy-seksjon. Figma- og Sketch-erfaring filtreres på i ATS.",
    ],
    relatedRoles: [
      "UX-designer",
      "UI-designer",
      "Produktdesigner",
      "Grafisk designer",
      "Webdesigner",
      "Industri-designer",
      "Motion designer",
      "Designsystem-leder",
    ],
    faq: [
      {
        q: "Skal CV-en min være designet og pen?",
        a: "Nei. Pen typografi og rydding er nok. En 'designet' CV med kolonner og ikoner feiler ofte i ATS, og rekrutterere ser umiddelbart at det er tom design uten formål.",
      },
      {
        q: "Hva hvis portfolioen min er under arbeid?",
        a: "Vent med å søke til portfolioen er klar, eller send en PDF-portfolio direkte sammen med søknaden. CV uten portfolio i design-bransjen blir sjelden lest.",
      },
      {
        q: "Skal case-studies være i CV-en eller separat?",
        a: "Separat, i portfolio. CV-en nevner case-studie i én linje per rolle, portfolioen utdyper.",
      },
    ],
  },
  {
    slug: "jus",
    name: "Jus",
    shortName: "jus",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for jurist og advokat",
    metaDescription:
      "CV-mal for advokater, jurister og paralegal i Norge. Spesialiseringer, tilsetting og publikasjoner i ATS-vennlig format.",
    intro: [
      "Jurist-CV i Norge skal vise utdanning (master i rettsvitenskap), advokatbevilling hvis aktuelt, spesialiseringer og konkret erfaring fra rettsområder. Større advokatfirmaer som Wikborg Rein, BAHR og Schjødt bruker ATS som filtrerer på rettsområde og erfaringsnivå.",
      "Denne malen er for jurister, advokater, advokatfullmektiger, paralegal og rettsforskere. Den prioriterer utdanning, advokatbevilling og spesialisering i den rekkefølgen rekrutterere i sektoren ser etter.",
    ],
    recommendedTemplate: "Konservativ klassisk mal med tydelig fag-spesialisering",
    templateReason:
      "Juridiske rekrutterere er konservative, og CV-stil signaliserer profesjonalitet. Klassisk én-spalte mal med tradisjonell typografi er forventet. Designet CV virker uprofesjonelt i bransjen.",
    aboutSection: {
      heading: "Slik bygger du en CV for jus",
      body: [
        "Utdanning øverst. Master i rettsvitenskap (cand.jur.) med universitet, år og snitt hvis det er over 3.5. PPU-prøve, godkjent advokatfullmektig-tjeneste og advokatbevilling med dato listet eksplisitt.",
        "Spesialisering som egen seksjon. Selskapsrett, M&A, skatterett, immaterialrett, prosedyre, internasjonal handelsrett, EU-rett. Spesifiser hvor mange år innenfor hvert område.",
        "For hver rolle: rettsområde, type klienter (børsnoterte, store private, offentlige), antall saker per år, og konkrete saker (med klient-navn hvis ikke konfidensielt og verdi/skala).",
        "Publikasjoner og foredrag. Artikler i Tidsskrift for forretningsjus, Lov og rett, foredrag på advokatforeningen-arrangementer eller universitets-undervisning.",
      ],
    },
    keywordsToInclude: [
      "Master i rettsvitenskap",
      "Cand.jur.",
      "Advokatbevilling",
      "Advokatfullmektig",
      "Selskapsrett",
      "M&A",
      "Skatterett",
      "Prosedyre",
      "Voldgift",
      "EU-rett / EØS-rett",
    ],
    exampleSummary:
      "Advokat med master i rettsvitenskap fra UiO (2018, 4.2 snitt) og advokatbevilling fra 2022. Spesialitet innen selskapsrett og M&A med erfaring fra 24 transaksjoner siste 3 år, kontraktsverdier fra 50 millioner til 1.2 milliarder kroner. Søker partner-spor.",
    exampleAchievements: [
      "Ledet juridisk arbeidsstrøm i M&A-transaksjon mellom to børsnoterte norske selskap med kontraktsverdi 800 millioner kroner.",
      "Forhandlet aksjonæravtaler for 6 venture-investeringer i 2024, samlet investeringsverdi 320 millioner.",
      "Publisert artikkel om norsk fusjonskontroll i Tidsskrift for forretningsjus, sitert tre ganger.",
      "Mentorerte 2 advokatfullmektiger gjennom prosedyre-prøven, begge bestod på første forsøk.",
    ],
    commonMistakes: [
      "Hopper over snitt fra master. For roller med under fem års erfaring forventer rekrutterere det.",
      "List 'rådgivning innen selskapsrett' uten konkrete transaksjoner eller saker. Volum og kompleksitet er det rekrutterere leser etter.",
      "Designet CV med farger eller ikoner. Bransjen er konservativ, og det signaliserer feil.",
      "Glemme PPU-prøve eller advokatbevilling-status. Det er hard kvalifisering.",
    ],
    relatedRoles: [
      "Advokat",
      "Advokatfullmektig",
      "Senior advokat",
      "Partner",
      "Inhouse-jurist",
      "Skattejurist",
      "Compliance officer",
      "Paralegal",
    ],
    faq: [
      {
        q: "Skal jeg ha med snitt fra master i rettsvitenskap?",
        a: "Ja, alltid hvis det er over 3.5. Også hvis du er under fem års erfaring. For seniorroller med 10+ år, kan du droppe det.",
      },
      {
        q: "Hva med klient-konfidensialitet?",
        a: "Ikke navngi klienter hvis NDA dekker. Beskriv heller transaksjonen generisk: 'M&A-transaksjon mellom to børsnoterte norske selskap, kontraktsverdi 800 millioner.'",
      },
      {
        q: "Skal pro bono-arbeid med?",
        a: "Ja, det er positivt og viser bredere engasjement. List samme detalj-nivå som betalt arbeid.",
      },
    ],
  },
  {
    slug: "transport",
    name: "Transport og logistikk",
    shortName: "transport",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for transport og logistikk",
    metaDescription:
      "CV-mal for sjåfører, kran-førere og logistikk-medarbeidere i Norge. Sertifikater, materiell og rute-erfaring i ATS-vennlig format.",
    intro: [
      "Transport-CV må vise sertifikater (CE, kran, truck, ADR), erfaring fra konkrete materielltyper og ruter, samt HMS-historikk. Større transportselskaper som Posten, Bring og Schenker bruker ATS som filtrerer først på sertifikater.",
      "Denne malen er for lastebilsjåfører, busssjåfører, kran-førere, truckførere, lager-medarbeidere og logistikk-koordinatorer. Den prioriterer sertifikater og materiell over generelt ansvar.",
    ],
    recommendedTemplate: "Klassisk mal med sertifikat- og materiell-seksjoner",
    templateReason:
      "Transport-rekrutterere skanner først etter førerkort-klasser, ADR, kran-sertifikater og truck-typer. En CV med tydelige seksjoner for sertifikater og materiell gir best ATS-resultat.",
    aboutSection: {
      heading: "Slik bygger du en CV for transport",
      body: [
        "Sertifikat-seksjon øverst. Førerkort-klasser (B, BE, C, CE, D, DE), YSK (yrkessjåfør-kompetanse), ADR (med klasser), kran (G2, G3, G4, G8, G11), truck (T1 til T5), digital fartsskriver-kort, helseattest. Med utløpsdato.",
        "Materiell-erfaring som egen seksjon. Spesifiser typer kjøretøy: trekkvogn med semi, bilskip, tippbil, lavlastvogn, kølebil, ADR-tank. Også spesifikke merker og modeller hvis de er etterspurt.",
        "Rute-erfaring og distanse. Innenlands, Norden, Europa-langtransport, by-distribusjon, terminal-arbeid. Antall år innenfor hver type.",
        "HMS-historikk. Antall år uten skader, gjennomførte HMS-kurs, deltakelse i sikkerhets-utvalg.",
      ],
    },
    keywordsToInclude: [
      "CE / klasse C-førerkort",
      "YSK",
      "ADR",
      "Kran-sertifikat",
      "Truck-sertifikat",
      "Digital fartsskriver",
      "Langtransport",
      "Lossing og lasting",
      "GPS-navigasjon",
      "Tachograph",
    ],
    exampleSummary:
      "Lastebilsjåfør med CE-førerkort, YSK og ADR (klasser 1, 2, 3, 5, 8). 12 års erfaring som langtransport-sjåfør med Norden- og Europa-ruter. Null skader siste 8 år, godkjent helseattest. Erfaring fra Schenker og DSV.",
    exampleAchievements: [
      "Kjørte langtransport Oslo-Hamburg ukentlig i 6 år, 100 prosent leveringssikkerhet og null skader.",
      "Mentorerte 5 nye sjåfører gjennom selskapets onboarding-program, alle bestod 6-måneders evaluering.",
      "Deltok i utvikling av ny rute-optimalisering med GPS-data, reduserte gjennomsnittlig drivstoff-forbruk med 7 prosent.",
      "Gjennomførte 14 ADR-relaterte transport-oppdrag årlig uten avvik, klasser 1 og 3 eksplosivt og brennbart.",
    ],
    commonMistakes: [
      "Glemme YSK eller utløpsdato på førerkort. Det er hard kvalifisering.",
      "Skrive 'sjåfør' uten å spesifisere kjøretøy-type eller rute. ATS filtrerer eksplisitt.",
      "Hoppe over ADR-klasser. Hvis du har dem, list klassene.",
      "Ikke nevne HMS-historikk. Null skader er en konkurransefordel som mange glemmer.",
    ],
    relatedRoles: [
      "Lastebilsjåfør",
      "Busssjåfør",
      "Kran-fører",
      "Truckfører",
      "Lager-medarbeider",
      "Logistikk-koordinator",
      "Transport-planlegger",
      "Speditør",
    ],
    faq: [
      {
        q: "Hvor mange års erfaring må jeg ha?",
        a: "For langtransport ofte minimum 2 år med CE, mer for ADR-spesifikke roller. Mange selskap tar lærlinger og nyutdannede med YSK direkte ut av kjøreskole.",
      },
      {
        q: "Skal jeg ha med utenlandsk førerkort?",
        a: "List det hvis det fortsatt er gyldig, men sørg for å nevne om det er konvertert til norsk. Rekrutterere må kunne verifisere.",
      },
      {
        q: "Hva med digitalt fartsskriver-kort?",
        a: "List det med utløpsdato. Det kreves for de fleste transportroller og er enkelt å glemme.",
      },
    ],
  },
  {
    slug: "restaurant",
    name: "Restaurant og servering",
    shortName: "restaurant",
    publishedAt: "2026-04-29",
    metaTitle: "CV mal for restaurant og servering",
    metaDescription:
      "CV-mal for kokker, servitører og bartendere i Norge. Sertifiseringer, kjøkken-erfaring og service i ATS-vennlig format.",
    intro: [
      "Restaurant-CV i Norge skal vise fagbrev (kokk, servitør, baker eller konditor), spesifikke kjøkkentyper og service-erfaring. Større kjeder og hoteller (Choice, Scandic, Thon) bruker ATS som filtrerer på fagbrev og erfaring fra kjøkken-typer.",
      "Denne malen er for kokker, sushi-kokker, bakere, konditorer, servitører, bartendere, hovmestere og restaurant-ledere. Den prioriterer fagbrev, kjøkken-erfaring og service-kvalitet i den rekkefølgen rekrutterere ser etter.",
    ],
    recommendedTemplate: "Klassisk mal med tydelig fagbrev- og kjøkken-seksjon",
    templateReason:
      "Restaurant-rekrutterere skanner først etter fagbrev-status og spesifikke kjøkken-typer (à la carte, fine dining, brasserie, sushi, fersk pasta). En klassisk mal med eksplisitte seksjoner gir best treffrate.",
    aboutSection: {
      heading: "Slik bygger du en CV for restaurant",
      body: [
        "Fagbrev øverst. Fagbrev som kokk, servitør, baker eller konditor med dato og sted. For utenlandske fagbrev, nevn om det er godkjent i Norge via NOKUT.",
        "For hver rolle: type kjøkken (fine dining, brasserie, à la carte, take-away, kantine), antall covers per service, ledelse-ansvar (sous chef, chef de partie, hovmester), spesialiteter.",
        "Helse-sertifiseringer: trygt mat-håndtering (HACCP), vaktmester-håndtering, ansvarlig vert eller skjenke-bevilling.",
        "Service-kvalitet og resultater. Mat-anmeldelser hvis stedet du jobbet på fikk dem (Tarteletten, White Guide, Michelin). Ledet team og bonus-stillinger.",
      ],
    },
    keywordsToInclude: [
      "Fagbrev kokk",
      "Fagbrev servitør",
      "À la carte",
      "Fine dining",
      "Brasserie",
      "Sous chef",
      "Chef de partie",
      "HACCP",
      "Skjenke-bevilling",
      "Ansvarlig vert",
    ],
    exampleSummary:
      "Kokk med fagbrev fra 2017 og syv års erfaring fra fine dining og brasserie. Tre år som chef de partie ved restaurant med White Guide-rating, før to år som sous chef ved nyåpnet brasserie. Spesialitet i moderne nordisk kjøkken og fersk pasta.",
    exampleAchievements: [
      "Chef de partie på White Guide-listet restaurant i 3 år, ansvarlig for fisk- og skalldyr-stasjon med opp til 80 covers per service.",
      "Sous chef ved nyåpnet brasserie, bidro til oppstart med menyutvikling og kjøkken-organisering, restaurant nådde lønnsomhet i måned 6.",
      "Mentorerte 4 lærlinger gjennom svenneprøve, alle bestod på første forsøk.",
      "Utviklet sesongmeny med lokale råvarer, økte gjennomsnittlig matkost-margin med 11 prosent uten priseøkning.",
    ],
    commonMistakes: [
      "Glemme fagbrev-dato og sted. Det er hard kvalifisering.",
      "Skrive 'kokk' uten å spesifisere kjøkken-type. À la carte og fine dining er ulike erfaringer.",
      "Hoppe over covers per service. Volum signaliserer hvilket nivå du har jobbet på.",
      "Lange beskrivelser uten konkrete restauranter eller anmeldelser.",
    ],
    relatedRoles: [
      "Kokk",
      "Sous chef",
      "Chef de partie",
      "Sushi-kokk",
      "Baker",
      "Konditor",
      "Servitør",
      "Bartender",
      "Hovmester",
      "Restaurant-leder",
    ],
    faq: [
      {
        q: "Hva hvis jeg ikke har fagbrev?",
        a: "List praktisk erfaring med konkrete restauranter, kjøkken-typer og roller. Mange restauranter ansetter uten fagbrev hvis erfaringen er solid, men fagbrev gir hard kvalifisering ved ATS-filtrering.",
      },
      {
        q: "Skal jeg ha med kortere vikariater?",
        a: "Slå dem sammen i en samleseksjon hvis de er kortere enn én måned. List individuelt hvis lengre.",
      },
      {
        q: "Hva med utenlandsk restaurant-erfaring?",
        a: "Liste den, spesielt fra anerkjente restauranter eller Michelin-stjerner. Nordmenn verdsetter spesielt erfaring fra Skandinavia, London og New York.",
      },
    ],
  },
];

export function getIndustryBySlug(slug: string): Industry | null {
  return INDUSTRIES.find((i) => i.slug === slug) ?? null;
}

export function getAllIndustrySlugs(): string[] {
  return INDUSTRIES.map((i) => i.slug);
}
