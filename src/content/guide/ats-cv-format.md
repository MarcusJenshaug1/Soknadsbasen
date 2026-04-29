---
title: "ATS-CV, Word eller PDF, hva er tryggest"
description: "Avklaring av hva ATS-systemer faktisk leser, om PDF eller DOCX er det beste valget i Norge, og hva som skiller en lesbar fil fra en som mister halvparten av teksten."
publishedAt: "2026-04-29"
updatedAt: "2026-04-29"
tags: ["CV"]
schema: "Article"
author:
  name: "Marcus Jenshaug"
related: ["ats-cv", "skrive-cv", "cv-mal-norsk-gratis"]
tldr:
  - "PDF med tekstlag er trygt for nesten alle ATS-systemer i Norge i 2026."
  - "DOCX er fortsatt akseptert, men har egne fallgruver med tabeller og innebygde fonter."
  - "Skannet PDF eller eksportert PDF uten tekstlag er det farligste alternativet."
  - "ATS-er kan lese passord-beskyttet PDF noen ganger, andre ganger ikke. Aldri send krypterte filer."
  - "Velg PDF som default. Send DOCX bare hvis utlysningen eksplisitt ber om det."
faq:
  - q: "Bør jeg sende PDF eller DOCX?"
    a: "PDF er det trygge default-valget. Den ser lik ut hos mottaker uavhengig av Word-versjon, og leses utmerket av nesten alle moderne ATS-systemer. Send DOCX bare hvis stillingsannonsen eksplisitt ber om det, eller hvis arbeidsgiver har et eldre system du vet krever Word."
  - q: "Hvordan vet jeg om PDF-en min har tekstlag?"
    a: "Åpne den, marker all teksten med Ctrl+A og kopier med Ctrl+C. Lim inn i et tomt tekstdokument. Hvis du ser navn, titler og bullets i lesbar form, har PDF-en tekstlag. Hvis det er tomt, er PDF-en flat (kun bilde)."
  - q: "Kan ATS lese skannet PDF?"
    a: "Noen kan, gjennom OCR (optisk tegngjenkjenning), men ikke alle. Resultatet er upålitelig, og navn, datoer og spesialtegn kan feiltolkes. Ikke bruk skannet CV i søknader."
  - q: "Hva med Pages-format eller andre tekstformater?"
    a: "Ikke send Pages-, Numbers- eller andre Apple-spesifikke formater. Eksporter til PDF før innsending. Det samme gjelder Open Office-format, ODT, som mange norske ATS ikke håndterer."
ctaMid:
  label: "Søknadsbasen eksporterer ATS-trygg PDF"
  href: "/registrer"
  text: "Alle CV-maler i Søknadsbasen eksporteres med fullt tekstlag, intakte fonter og uten kolonner som forvirrer ATS-parsing."
ctaEnd:
  label: "Test selv på 7 dager gratis"
  href: "/registrer"
  text: "Bygg CV, eksporter PDF, kopier ut teksten og se selv at parsingen er riktig."
---

## Word eller PDF, dette er hva som faktisk skjer i ATS

Du har skrevet ferdig CV-en. Skal du sende den som Word-fil eller PDF? På Reddit og i karriere-blogger får du forskjellige svar: "alltid PDF", "alltid Word, det er det ATS leser best", "det spiller ingen rolle".

Det riktige svaret avhenger av hva ATS faktisk gjør med filen. La oss se på det.

## Hva ATS gjør, steg for steg

Når du laster opp en CV på en jobbportal eller et søknadsskjema, går filen gjennom en prosess som ser slik ut:

1. **Filen mottas og lagres** i ATS-databasen, koblet til søker-profilen din.
2. **Tekst-ekstraksjon** kjøres på filen. PDF-er åpnes med en parser som leser tekstlag. DOCX-filer leses med XML-parser. Skannede dokumenter går gjennom OCR (optisk tegngjenkjenning).
3. **Strukturering** prøver å identifisere seksjoner, datoer, jobbtitler, utdanning og ferdigheter.
4. **Indeksering** lagrer den ekstraherte teksten i et søkbart format slik at rekrutterer kan søke på "Python" eller "sykepleier" og finne deg.
5. **Visning** for rekrutterer skjer i ATS-grensesnittet, ikke i originalfilen din.

Punkt 2 er der filtypen betyr noe. Hvis tekst-ekstraksjonen feiler, er du usynlig i punkt 4, uansett hvor pen filen din ser ut i punkt 5.

## PDF, fordelene

PDF er det mest forutsigbare formatet. En PDF som er eksportert fra Word, Google Docs eller en CV-bygger som Søknadsbasen, har alltid samme tekst-innhold og struktur uavhengig av hvilken PDF-leser eller ATS som leser den.

Konkrete fordeler:

- **Layouten er låst.** Det du ser, er det rekrutteren ser. Ingen Word-versjon-konflikter, ingen fontlater som forsvinner.
- **Tekst-ekstraksjon er pålitelig** for moderne ATS. Workday, Greenhouse, Lever, Webcruiter, ReachMee og Jobylon parser PDF utmerket.
- **Mindre filstørrelse** enn DOCX i de fleste tilfeller, fordi formatering komprimeres.
- **Profesjonelt inntrykk.** PDF signaliserer at du har sendt en ferdig fil, ikke et arbeidsdokument.

## PDF, fallgruvene

PDF har bare én alvorlig fallgruve: PDF uten tekstlag. Den oppstår på tre måter:

1. **Skannet papirdokument.** Du har papir-CV, har skannet den med telefonen eller kopimaskinen, og sender skanningen som PDF. Filen inneholder kun et bilde, ingen tekst.
2. **Eksportert som bilde.** Noen designprogrammer (Adobe Illustrator, gamle Photoshop-versjoner) eksporterer "PDF" der teksten er flatlagt som bilde.
3. **Sikkerhetskopiert PDF.** Hvis du har eksportert som "Print to PDF" på en gammel printer, kan tekstlaget mistes.

Test alltid: åpne PDF-en, marker all tekst med Ctrl+A, kopier med Ctrl+C, lim inn i et tomt dokument. Hvis du ser ren tekst, er du trygg. Hvis det er tomt, må du eksportere på nytt fra kildefilen.

## DOCX, fordelene

Word-format har noen fordeler, men færre enn folk tror:

- **Eldre ATS-systemer** (særlig på 2010-tallet) hadde tider der DOCX-parsing var mer pålitelig enn PDF. I 2026 er dette i stor grad utdatert.
- **Redigerbar for rekrutter** hvis de skal endre formatering eller legge til kommentarer. Sjelden relevant.
- **Standard for noen offentlige stillingsskjemaer**, spesielt i kommuner og statsforetak.

## DOCX, fallgruvene

Word-format er mer ustabilt enn PDF i mange ATS-flyt:

- **Tabeller blir ofte feilparset.** Hvis du har bygd CV-en med tabell-struktur, kan ATS lese tabellen radvis i stedet for kolonnevis, og erfaringer havner i feil kontekst.
- **Innebygde fonter** kan mangle. Hvis du bruker en font som ikke finnes på rekruttererens system, kan teksten erstattes med en standard-font og endre layouten.
- **Versjons-konflikter.** Word 2010-format og Word 2024-format har subtile forskjeller. Eldre ATS kan ikke håndtere nyere XML-elementer.
- **Macros og innebygde objekter.** Noen Word-maler har macros som ATS skal blokke, men noen filtrer hele dokumentet.

## Hva ATS-leverandørene selv anbefaler

Se hva de fire mest brukte systemene i Norge sier:

- **Webcruiter** (eier brukt av kommuner, KS, Statsbygg): "Vi støtter PDF, DOC og DOCX. Anbefalt: PDF."
- **ReachMee** (Posten, KLP, Aker BioScience): "PDF foretrekkes for konsistent visning."
- **Workday** (Equinor, Telenor Group, DNB): "PDF eller DOCX, opp til 5MB."
- **Jobylon** (mange startups og scale-ups): "PDF anbefales sterkest."

Mønsteret er tydelig. PDF foretrekkes nesten alltid.

## Når DOCX faktisk er bedre

Det finnes få situasjoner der DOCX er det rette valget:

1. **Utlysningen sier eksplisitt 'send i Word-format'**. Da følg instruksjonen.
2. **Du søker via en kommunal stillingsportal** som ikke aksepterer PDF. Det er sjelden i 2026, men forekommer.
3. **Rekrutterer har bedt om Word-fil for å redigere CV-en** før de presenterer den til kunde. Dette skjer i noen rekrutterings-byrå-flyt.

Utenfor disse, send PDF.

## Filnavn og praktiske detaljer

Filnavn ATS faktisk leser:

- `marie-andersen-cv.pdf` ja
- `cv-2024-final-v3.pdf` nei (uprofesjonelt, feilet versjons-tracking)
- `Marie Andersen CV.pdf` ja (mellomrom OK, men bindestrek bedre for URL-friendly)
- `cv.pdf` nei (hjelper hverken deg eller arbeidsgiver med å finne den senere)

Anbefalt mønster: `fornavn-etternavn-cv.pdf` eller `fornavn-etternavn-cv-stilling.pdf` hvis du har flere versjoner.

Filstørrelse: hold under 2MB. Større filer kan feile i opplasting på noen ATS, og signaliserer ofte at du har lagt inn unødvendige bilder.

## Hva med Apple Pages og andre formater?

Ikke send Pages, Numbers, ODT, Markdown eller HTML som CV-format. Selv om noen ATS teknisk kan lese dem, er det utenfor det forventede, og kan kreve manuell konvertering hos rekrutteren. Det er ekstra arbeid de ikke gjorde for søkere som sendte PDF.

Apple-brukere: i Pages, velg Fil > Eksporter til > PDF. Sørg for at "Best for printing" er valgt for å beholde tekstlag.

## Test din CV mot ATS før du sender

Det finnes gratis-verktøy som simulerer ATS-parsing av CV-en din:

- [Resume Worded](https://resumeworded.com): begrenset gratis-bruk, viser hvilke ord ATS plukker ut.
- [Jobscan](https://jobscan.co): sammenligner CV-en din mot stillingsannonsen.
- [Skillsync](https://skillsync.io): norsk verktøy med fokus på matchgrad.

Eller, det enkleste: kjør tekstkopi-testen som beskrevet over. 90 prosent av ATS-problemer fanges der.

## Konklusjon

PDF med tekstlag er det rette valget for nesten alle norske søknader i 2026. DOCX er akseptert, men har flere fallgruver. Skannet PDF eller flatlagt PDF (uten tekstlag) er den vanligste årsaken til at en ellers god CV blir usynlig i ATS.

[CV-byggeren i Søknadsbasen](/registrer) eksporterer PDF med fullt tekstlag som standard. Hvis du heller bygger i Word, sørg for at du eksporterer via Fil > Eksporter > Opprett PDF/XPS, ikke via Print > Save as PDF, som kan miste tekstlaget.
