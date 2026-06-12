import "server-only";

import { claudeGenerate } from "@/lib/claude";
import { parseLooseJson } from "@/lib/json";

/**
 * Haiku-kjernen for ATS-nøkkelord fra en CV-summary. Delt mellom
 * /api/ai/cv-keywords (ATS-visning) og match-run (Match meg-knappen) så
 * prompten aldri drifter — begge skriver til samme aiKeywords-cache.
 */

const SYSTEM = `Du er en ATS-spesialist. Generer en UTFYLLENDE liste ATS-nøkkelord fra denne CV-en — alle termer rekrutterings-systemer kan matche mot ulike stillingsannonser. Bedre å ha flere relevante enn for få. Returner GYLDIG JSON.

SCHEMA:
{ "keywords": ["string", ...] }

REGLER:
- 30-50 nøkkelord, sortert etter viktighet.
- INKLUDER:
  • Yrkestittel + ALLE relevante synonymer (om CV sier "Fullstack-utvikler" inkluder også: utvikler, systemutvikler, IKT-systemutvikler, programmerer, frontend-utvikler, backend-utvikler, webutvikler, software engineer)
  • Tekniske ferdigheter (React, SQL, TypeScript, AutoCAD, etc.)
  • Verktøy/plattformer (Salesforce, SAP, Figma, Azure, Storybook)
  • Konsepter/metoder (CI/CD, agile, ISR, server-komponenter, prosjektledelse)
  • Domener/bransjer (eiendom, B2B, e-handel, helsetjenester, finans, sikkerhet)
  • Sertifiseringer (PRINCE2, autorisasjon, vekterkort)
  • Språk (engelsk, norsk)
  • Soft skills demonstrert i CV-en (ledelse, kommunikasjon, beslutningstaking, problemløsning)
- EKSKLUDER: stedsnavn, datoer, bedriftsnavn, generiske ord (jobb, person, ansvarlig).
- Norsk taksonomi: bruk NAV-aktige termer der relevant (IKT-systemutvikler, Servicemedarbeider, etc.) i tillegg til engelske der relevant.
- Bruk korte termer (1-3 ord). Lowercase med mindre egennavn (React, SAP, Excel, TypeScript).
- Returner KUN JSON. Ingen markdown, ingen forklaring.`;

/** Kaster ved AI-feil; returnerer tom liste kun ved tomt/ugyldig svar. */
export async function extractCvKeywords(summary: string): Promise<string[]> {
  const raw = await claudeGenerate(`=== CV ===\n${summary}\n=== SLUTT ===`, {
    model: "claude-haiku-4-5",
    system: SYSTEM,
    temperature: 0.1,
    maxOutputTokens: 1500,
    json: true,
  });
  const parsed = parseLooseJson(raw) as { keywords?: unknown };
  return Array.isArray(parsed.keywords)
    ? parsed.keywords
        .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        .map((k) => k.trim())
        .slice(0, 50)
    : [];
}
