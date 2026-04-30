/**
 * NAV pam-stilling-feed leverer mange tekstfelter i UPPERCASE (region,
 * city, county). Denne helperen normaliserer til Title Case for visning.
 *
 * Bevarer eksisterende mixed-case (f.eks. "Skien kommune") uendret
 * for å unngå feilkasing der kilden allerede er korrekt.
 */
export function displayPlace(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Hvis strengen inneholder en lowercase-bokstav, antar vi at kilden er
  // korrekt formattert og lar den være.
  if (/[a-zæøå]/.test(trimmed)) return trimmed;

  return trimmed
    .toLocaleLowerCase("nb-NO")
    .split(/(\s|-|\/)/)
    .map((part) =>
      /^[a-zæøå]/i.test(part)
        ? part.charAt(0).toLocaleUpperCase("nb-NO") + part.slice(1)
        : part,
    )
    .join("");
}

/**
 * NAV-kategorier kommer både med og uten stor forbokstav ("sykepleier" vs
 * "Butikkmedarbeider"). Sikrer konsistent visning ved å sette stor
 * forbokstav på første tegn og la resten være.
 */
export function formatCategory(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return (
    trimmed.charAt(0).toLocaleUpperCase("nb-NO") + trimmed.slice(1)
  );
}

/**
 * Norske telefonnumre fra NAV kommer i alle slags formater:
 * "+47 90629198", "9062 9198", "+4790629198 90629198" (duplikat med
 * mellomrom). Splitter input i kandidater, normaliserer hver til
 * "+47 XXX XX XXX", og dedup'er. Utenlandske numre får +<landkode>.
 *
 * Returnerer tom array hvis ingen gyldige numre.
 */
export function formatPhones(input: string | null | undefined): string[] {
  if (!input) return [];

  // Splitt først på åpenbare separatorer (komma, semikolon, slash). Hver bit
  // kan fortsatt inneholde flere numre limt sammen med mellomrom.
  const segments = input.split(/\s*[,;/]\s*/);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const segment of segments) {
    for (const formatted of extractNumbersFromSegment(segment)) {
      const key = formatted.replace(/\s+/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(formatted);
    }
  }
  return out;
}

/**
 * Tar et tekstsegment som kan inneholde 0, 1 eller flere numre limt sammen
 * (med eller uten mellomrom). Trekker ut hver nummerkandidat og formaterer.
 */
function extractNumbersFromSegment(segment: string): string[] {
  // Behold + og sifre, fjern alt annet (inkl. mellomrom). Slik håndterer vi
  // "+47 90 62 91 98" som ett nummer.
  const cleaned = segment.replace(/[^\d+]/g, "");
  if (cleaned.length < 8) return [];

  const out: string[] = [];
  // Splitt på + (hver + starter et nytt nummer). Første del kan være uten +.
  const parts = cleaned.split("+").filter(Boolean);

  for (const part of parts) {
    // Hver part er ren sifferstreng, som kan være ett eller flere numre
    // sittende etter hverandre.
    let digits = part;
    while (digits.length >= 8) {
      const chunk = takeOneNumber(digits);
      if (!chunk) break;
      out.push(formatSingleNumber(chunk));
      digits = digits.slice(chunk.length);
    }
  }
  return out;
}

/**
 * Kutter ut ett enkelt nummer fra starten av en sifferstreng. Returnerer
 * den delen som hører til nummeret. Norske mønstre prioriteres (8 sifre
 * eller 47 + 8 sifre).
 */
function takeOneNumber(digits: string): string | null {
  if (digits.length < 8) return null;
  if (digits.startsWith("47") && digits.length >= 10) return digits.slice(0, 10);
  // Standard norsk mobil/fastnett
  if (digits.length >= 8) return digits.slice(0, 8);
  return null;
}

function formatSingleNumber(digits: string): string {
  if (digits.startsWith("47") && digits.length === 10) {
    const local = digits.slice(2);
    return `+47 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5)}`;
  }
  if (digits.length === 8) {
    return `+47 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

/**
 * Trekker ut ATS-keywords fra en stilling. Slår sammen NAV's strukturerte
 * klassifisering (categoryList + occupationList + category + occupation)
 * MED eventuelle AI-genererte aiKeywords. NAV-taksonomi er alltid med
 * (kanonisk vokabular), AI utvider med tekniske ferdigheter, verktøy,
 * domener og synonymer.
 */
export function extractJobKeywords(job: {
  category: string | null;
  occupation?: string | null;
  categoryList?: unknown;
  occupationList?: unknown;
  aiKeywords?: string[] | null;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (kw: string | null | undefined) => {
    if (!kw) return;
    const key = kw.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(kw);
  };
  // NAV-klassifisering først (kanonisk yrkesvokabular)
  add(job.category);
  if (job.occupation && job.occupation !== job.category) add(job.occupation);
  for (const c of asNamedList(job.categoryList)) add(c);
  for (const c of asNamedList(job.occupationList)) add(c);
  // AI-utvinnede termer (tech, verktøy, soft skills, synonymer)
  for (const kw of job.aiKeywords ?? []) add(kw);
  return out;
}

function asNamedList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) =>
      typeof v === "object" && v !== null && "name" in v && typeof (v as { name?: unknown }).name === "string"
        ? ((v as { name: string }).name)
        : null,
    )
    .filter((s): s is string => Boolean(s));
}

/**
 * Filtrer ut åpenbart ugyldige region/kategori-verdier som har sneket seg
 * inn fra feeden ("?", tomme, single-char støy).
 */
export function isValidFacet(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  if (trimmed === "?" || trimmed === "??") return false;
  return true;
}
