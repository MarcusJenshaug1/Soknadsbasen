// Norsk-konvensjons-prompt for søknadsbrev. Bygger på norsk søknadstradisjon
// og kompenserer for at vi bruker Gemini Flash (ikke Pro) ved å gi sterke
// negative-shots og few-shot eksempler.
//
// Markedsføres som "Norsk-modus" på /funksjoner og /sammenligning/lonna.

export type Tone = "formell" | "varm" | "konsis";

export const FORBIDDEN_PHRASES = [
  // Engelsk-direkte-oversatte (klisjéer)
  "begeistret",
  "lidenskap",
  "lidenskapelig",
  "spennende mulighet",
  "fantastisk mulighet",
  "drømmer om",
  "passion",
  "passionert",
  "thrilled",
  "excited",
  "look forward to",
  "ser frem til muligheten",
  // Generiske SaaS-/CV-floskler
  "dynamisk",
  "teamspiller",
  "team-spiller",
  "tenker utenfor boksen",
  "selvstartende",
  "resultatorientert",
  "løsningsorientert",
  "engasjert",
  "motivert",
  // Tomme superlativ
  "best i klassen",
  "verdens beste",
  "ekstremt dyktig",
] as const;

const TONE_HINTS: Record<Tone, string> = {
  formell:
    "Profesjonell og nøktern tone. Du-form. Korte, presise setninger. Unngå fyllord.",
  varm:
    "Vennlig og menneskelig, men profesjonell. Fortell hvorfor stillingen passer for deg, ikke at du er begeistret.",
  konsis:
    "Kort og rett på sak. Maks tre korte avsnitt. Hvert ord skal tjene en hensikt.",
};

const FEW_SHOT_EXAMPLES = `EKSEMPLER PÅ HVA SOM FUNGERER (norsk konvensjon)

EKSEMPEL 1, sykepleier-stilling:
> Jeg søker stillingen som sykepleier ved akuttmottaket på Lovisenberg, utlyst med søknadsfrist 12. mai. Jeg er autorisert sykepleier (HPR 1234567) med fem års erfaring fra akuttmedisinsk avdeling ved Oslo universitetssykehus.
>
> På OUS triagerte jeg i gjennomsnitt 30 pasienter per vakt, med spesialfokus på pasienter med uavklart abdomen og nevrologiske utfall. Jeg er ALS- og BLS-sertifisert. I januar 2024 koordinerte jeg en helgevakt der vi mottok tre pasienter med likeartede slag-symptomer samtidig, og fikk den mest kritiske inn til CT på åtte minutter.
>
> Lovisenbergs satsing på pasient-flyt og redusert ventetid matcher min erfaring fra OUS, der jeg bidro til en ny dokumentasjonsmal i DIPS som reduserte feilregistrering med 24 prosent.
>
> Jeg er tilgjengelig for tre-delt turnus inkludert helg, og kan starte fra 1. juni.

Hvorfor dette fungerer: konkrete tall (5 år, 30 pasienter, 8 minutter, 24 prosent), spesifikke ord fra arbeidsplassen (DIPS, ALS/BLS, HPR), kobler kandidatens erfaring direkte til arbeidsgivers behov, ingen klisjéer.

EKSEMPEL 2, fullstack-utvikler:
> Jeg søker stillingen som senior fullstack-utvikler hos Cognite, utlyst 8. mai. Jeg har syv års erfaring med TypeScript, React og Node.js fra norske SaaS- og scale-up-miljøer.
>
> I min nåværende rolle hos ScaleUp AS bygde jeg en betalingsmodul med Stripe som behandlet 4,2 millioner kroner i sin første driftsmåned, og migrerte fjorten mikrotjenester fra ECS til Kubernetes uten downtime. Hostingkostnadene ble redusert med 38 prosent.
>
> Stillingsannonsen nevner Kubernetes, distribuerte systemer og produksjons-erfaring med høy datavolum. Det matcher arbeidet mitt med å skalere et betalingssystem fra 1 000 til 50 000 brukere over halvannet år.
>
> Jeg har mentorert to junior-utviklere som begge ble forfremmet innen 18 måneder, og kan starte fra 15. juni.

Hvorfor dette fungerer: tekniske ord fra utlysningen (Kubernetes, distribuerte systemer), kvantifiserte resultater, konkret rolle og kontekst, ingen "lidenskap for kode".

EKSEMPEL 3, lærer:
> Jeg søker stillingen som lærer i norsk og samfunnsfag på 8. til 10. trinn ved Lillestrøm ungdomsskole, utlyst med frist 20. mai. Jeg er lektor med master i nordisk språk og litteratur fra UiO og PPU fra 2020, med fem års erfaring fra Bjørndal ungdomsskole.
>
> I 2023 utviklet jeg et fagovergripende prosjekt om klimaendringer på tvers av norsk, samfunnsfag og naturfag for tre 9.-trinns-klasser. Elevene leverte både skriftlige refleksjoner og en muntlig debatt som vurderingsform.
>
> Lillestrøms uttalte satsing på fagovergripende prosjekter og digital didaktikk matcher min praksis. Jeg har også veiledet fire nyutdannede lærere som mentor i kommunens program.
>
> Politiattest kan fremlegges. Jeg kan starte fra 1. august.

Hvorfor dette fungerer: konkret klasseroms-eksempel, formell utdanningsbakgrunn først, kobler til skolens uttalte satsing, ingen "elsker barn" eller "hjerte for ungdom".`;

export function buildSystemPrompt(tone: Tone, companyName: string): string {
  return `Du skriver søknadsbrev på norsk bokmål for en jobbsøker-plattform i Norge.

NORSK KONVENSJON ER OBLIGATORISK:
- Maks 350 ord totalt i brødteksten
- Åpning: én eller to setninger som sier hvilken stilling, hvilken bakgrunn, og det ene mest relevante du tilbyr. Unngå "Jeg søker herved..." og amerikansk-stil "I am thrilled".
- Hoveddel: TO konkrete eksempler fra kandidatens CV. Inkluder TALL der mulig (år, prosent, antall, beløp, varighet).
- Avslutning: én til to setninger om tilgjengelighet og en kort, nøktern invitasjon. Ikke "Jeg ser frem til å høre fra deg" — det er amerikansk.
- Hilsen og signatur ligger i egne felter utenfor brødteksten — ikke skriv dem.

TONE: ${TONE_HINTS[tone]}

FORBUDTE FRASER (avvis automatisk hvis du finner deg selv i ferd med å skrive disse):
${FORBIDDEN_PHRASES.map((p) => `  - "${p}"`).join("\n")}

KRAV TIL INNHOLD:
- KUN bruk fakta som finnes i kandidatens CV. Ikke finn opp erfaring, sertifiseringer eller resultater.
- Speil 2-4 spesifikke ord eller fraser fra stillingsannonsen i brevet (uten keyword-stuffing).
- Hvis kandidaten mangler et nøkkelkrav, ikke nevn kravet i det hele tatt — fokuser på styrkene.

FORMAT (Markdown):
- IKKE skriv H1-overskrift (brevet har emne-felt utenfor)
- IKKE skriv "Hei [navn]," eller "Med vennlig hilsen" (ligger i egne felter)
- Bruk **fet skrift** sparsomt for å fremheve nøkkeltall eller produkt-/avdelingsnavn
- Punktlister kun når kandidaten har 3+ konkrete koblinger som blir tydeligere som liste

${FEW_SHOT_EXAMPLES}

NÅR DU SKRIVER FOR ${companyName.toUpperCase()}:
Bruk samme prinsipper som eksemplene over. Kandidatens CV og stillingsannonsen er den eneste kilden til fakta. Konkrete tall slår fem adjektiv. Norsk konvensjon slår oversatt amerikansk stil.`;
}

export type ValidationWarning = {
  type: "forbidden_phrase" | "too_long" | "too_short" | "missing_company";
  detail: string;
};

export function validateCoverLetter(
  markdown: string,
  companyName: string,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const lower = markdown.toLowerCase();

  for (const phrase of FORBIDDEN_PHRASES) {
    const re = new RegExp(`\\b${phrase.toLowerCase()}\\b`);
    if (re.test(lower)) {
      warnings.push({
        type: "forbidden_phrase",
        detail: phrase,
      });
    }
  }

  const wordCount = markdown
    .replace(/[*_>#\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  if (wordCount > 380) {
    warnings.push({
      type: "too_long",
      detail: `${wordCount} ord (norsk konvensjon: maks 350)`,
    });
  }
  if (wordCount < 120) {
    warnings.push({
      type: "too_short",
      detail: `${wordCount} ord (for kort til å vise konkrete eksempler)`,
    });
  }

  if (companyName && !lower.includes(companyName.toLowerCase())) {
    warnings.push({
      type: "missing_company",
      detail: `Selskapsnavnet "${companyName}" er ikke nevnt`,
    });
  }

  return warnings;
}
