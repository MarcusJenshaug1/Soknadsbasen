/**
 * Kanoniske verdisett for de AI-utvunne jobb-facettene + publisert-buckets.
 * Eneste sannhetskilde — brukes av enrich-prompten (enum-skjema), DB-skriving
 * (koersjon), facett-RPC-parametre og UI-labels. Koder lagres lowercase i DB.
 *
 * Førerkort-settet er bevisst forenklet til B/BE/C/D (designbeslutning);
 * øvrige klasser fra annonsetekst mappes til nærmeste eller droppes.
 */

export const UTDANNING_CODES = [
  "ingen-krav",
  "videregaende",
  "fagbrev",
  "fagskole",
  "bachelor",
  "master",
] as const;
export type UtdanningCode = (typeof UTDANNING_CODES)[number];

export const UTDANNING_LABELS: Record<UtdanningCode, string> = {
  "ingen-krav": "Ingen krav",
  videregaende: "Videregående",
  fagbrev: "Fagbrev",
  fagskole: "Fagskole",
  bachelor: "Bachelor",
  master: "Master",
};

export const ERFARING_CODES = ["ingen", "noe", "mye"] as const;
export type ErfaringCode = (typeof ERFARING_CODES)[number];

export const ERFARING_LABELS: Record<ErfaringCode, string> = {
  ingen: "Ingen krav",
  noe: "Noe erfaring (1–3 år)",
  mye: "Mye erfaring (4+ år)",
};

export const FORERKORT_CODES = ["B", "BE", "C", "D"] as const;
export type ForerkortCode = (typeof FORERKORT_CODES)[number];

export const FORERKORT_LABELS: Record<ForerkortCode, string> = {
  B: "B — personbil",
  BE: "BE — m/henger",
  C: "C — lastebil",
  D: "D — buss",
};
/** Spesialverdi i filter (ikke i DB): tom aiDriversLicense = ingen krav. */
export const FORERKORT_INGEN_KRAV = "ingen-krav";

export const SPRAK_CODES = ["norsk", "engelsk", "skandinavisk", "samisk"] as const;
export type SprakCode = (typeof SPRAK_CODES)[number];

export const SPRAK_LABELS: Record<SprakCode, string> = {
  norsk: "Norsk",
  engelsk: "Engelsk",
  skandinavisk: "Skandinavisk",
  samisk: "Samisk",
};

export const HJEMMEKONTOR_CODES = ["hjemmekontor", "hybrid", "ikke-mulig"] as const;
export type HjemmekontorCode = (typeof HJEMMEKONTOR_CODES)[number];

export const HJEMMEKONTOR_LABELS: Record<HjemmekontorCode, string> = {
  hjemmekontor: "Kun hjemmekontor",
  hybrid: "Hybrid",
  "ikke-mulig": "Ikke mulig",
};

/** Publisert-bucket → antall dager bakover. Kumulative («Siste uke» dekker i dag). */
export const PUBLISERT_BUCKETS = {
  "24t": 1,
  "3d": 3,
  "7d": 7,
  "14d": 14,
} as const;
export type PublisertBucket = keyof typeof PUBLISERT_BUCKETS;

export const PUBLISERT_LABELS: Record<PublisertBucket, string> = {
  "24t": "Nye i dag",
  "3d": "Siste 3 dager",
  "7d": "Siste uke",
  "14d": "Siste to uker",
};

// ─── Koersjon av LLM-output ─────────────────────────────────────────────
// Structured output garanterer gyldig JSON, men casing/synonymer valideres
// alltid i TS før DB-skriving. Ukjente verdier droppes stille (felter er
// best effort — heller tomt enn feil).

function coerceToSet<T extends string>(
  values: unknown,
  codes: readonly T[],
): T[] {
  if (!Array.isArray(values)) return [];
  const out = new Set<T>();
  for (const v of values) {
    if (typeof v !== "string") continue;
    const hit = codes.find((c) => c.toLowerCase() === v.trim().toLowerCase());
    if (hit) out.add(hit);
  }
  return [...out];
}

export function coerceUtdanning(values: unknown): UtdanningCode[] {
  return coerceToSet(values, UTDANNING_CODES);
}

export function coerceErfaring(value: unknown): ErfaringCode | null {
  if (typeof value !== "string") return null;
  const hit = ERFARING_CODES.find((c) => c === value.trim().toLowerCase());
  return hit ?? null;
}

/** Mapper førerkort-klasser fra tekst til det forenklede settet (C1/CE→C, D1/DE→D). */
export function coerceForerkort(values: unknown): ForerkortCode[] {
  if (!Array.isArray(values)) return [];
  const out = new Set<ForerkortCode>();
  for (const v of values) {
    if (typeof v !== "string") continue;
    const code = v.trim().toUpperCase();
    if ((FORERKORT_CODES as readonly string[]).includes(code)) {
      out.add(code as ForerkortCode);
    } else if (code === "C1" || code === "C1E" || code === "CE") {
      out.add("C");
    } else if (code === "D1" || code === "D1E" || code === "DE") {
      out.add("D");
    }
    // A/AM/S/T m.fl. droppes — utenfor det kuraterte settet.
  }
  return [...out];
}

export function coerceSprak(values: unknown): SprakCode[] {
  return coerceToSet(values, SPRAK_CODES);
}

export function coerceHjemmekontor(value: unknown): HjemmekontorCode | null {
  if (typeof value !== "string") return null;
  const hit = HJEMMEKONTOR_CODES.find((c) => c === value.trim().toLowerCase());
  return hit ?? null;
}
