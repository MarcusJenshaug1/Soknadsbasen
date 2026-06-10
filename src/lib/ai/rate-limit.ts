/**
 * Per-bruker rate-limiting for AI-rutene. Claude koster penger per kall, så en
 * innlogget bruker skal ikke kunne spamme endepunktene og blåse opp regningen.
 *
 * MERK: in-memory sliding window. På Vercel serverless er bøtta per-instans, så
 * grensen er best-effort (en bruker kan få litt mer enn LIMIT hvis kallene
 * treffer ulike instanser). Det matcher mønsteret i resten av kodebasen
 * (cvShareToken.ts, collabToken.ts). En durabel oppgradering er Postgres- eller
 * Upstash/KV-backet teller delt på tvers av instanser.
 */

export const AI_RATE_LIMIT_MESSAGE =
  "For mange AI-forespørsler på kort tid. Vent et øyeblikk og prøv igjen.";

const WINDOW_MS = 60_000;
const LIMIT = 15;

const buckets = new Map<string, number[]>();

/** Returnerer true hvis kallet er innenfor grensen (og registrerer det). */
export function checkAiRateLimit(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const hits = (buckets.get(userId) ?? []).filter((t) => t > cutoff);
  if (hits.length >= LIMIT) {
    buckets.set(userId, hits);
    return false;
  }
  hits.push(now);
  buckets.set(userId, hits);
  return true;
}
