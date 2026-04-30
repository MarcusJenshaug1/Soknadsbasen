import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";
import { parseActiveResume } from "@/lib/resume-server";

/**
 * POST /api/ai/cv-keywords
 * Returns: { keywords: string[], cached: boolean, source: "ai" | "fallback" }
 *
 * Henter (eller computer + cacher) ATS-relevante nøkkelord fra brukerens
 * aktive CV. Cache invalideres når CV endres (hash) eller etter 24t.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: {
      resumeData: true,
      aiKeywords: true,
      aiKeywordsAt: true,
      aiKeywordsHash: true,
    },
  });
  if (!userData) {
    return NextResponse.json({ keywords: [], cached: false, source: "fallback" });
  }

  const resume = parseActiveResume(userData.resumeData);
  if (!resume) {
    return NextResponse.json({ keywords: [], cached: false, source: "fallback" });
  }

  const summary = buildResumeSummary(resume as unknown as Record<string, unknown>);
  const hash = createHash("sha256").update(summary).digest("hex").slice(0, 32);

  const stillFresh =
    userData.aiKeywords.length > 0 &&
    userData.aiKeywordsHash === hash &&
    userData.aiKeywordsAt &&
    Date.now() - userData.aiKeywordsAt.getTime() < CACHE_TTL_MS;

  if (stillFresh) {
    return NextResponse.json({
      keywords: userData.aiKeywords,
      cached: true,
      source: "ai",
    });
  }

  const system = `Du er en ATS-spesialist. Trekk ut ALLE ATS-relevante nøkkelord fra denne CV-en — det rekrutterings-systemer matcher mot stillingsannonser. Returner GYLDIG JSON.

SCHEMA:
{ "keywords": ["string", ...] }

REGLER:
- Maks 30 nøkkelord, sortert etter viktighet (kjernekompetanse først).
- INKLUDER: yrkestitler/roller (sykepleier, frontend-utvikler, lærer, vekter), tekniske ferdigheter (React, SQL, Excel, AutoCAD), verktøy/plattformer (Salesforce, SAP, Figma), domener (B2B, e-handel, helsetjenester), sertifiseringer (PRINCE2, autorisasjon, vekterkort), språk-krav (engelsk, norsk), bransjer (helsevesen, finans, retail), soft skills som er konkret demonstrert (ledelse, kommunikasjon).
- EKSKLUDER: stedsnavn, datoer, generiske ord (jobb, person, ansvarlig).
- Bruk korte termer (1-3 ord). Lowercase med mindre egennavn (React, SAP, Excel).
- Returner KUN JSON. Ingen markdown, ingen forklaring.`;

  const userPrompt = `=== CV ===\n${summary}\n=== SLUTT ===`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.1,
      maxOutputTokens: 1000,
      json: true,
    });
    const parsed = parseLooseJson(raw) as { keywords?: unknown };
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim())
          .slice(0, 30)
      : [];

    if (keywords.length > 0) {
      await prisma.userData.update({
        where: { userId: session.userId },
        data: {
          aiKeywords: keywords,
          aiKeywordsAt: new Date(),
          aiKeywordsHash: hash,
        },
      });
    }

    return NextResponse.json({ keywords, cached: false, source: "ai" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI-feil" },
      { status: 502 },
    );
  }
}

function buildResumeSummary(resume: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof resume.role === "string" && resume.role.trim()) {
    parts.push(`Rolle: ${resume.role}`);
  }
  if (typeof resume.summary === "string" && resume.summary.trim()) {
    parts.push(`Profil: ${String(resume.summary).slice(0, 600)}`);
  }
  if (Array.isArray(resume.skills) && resume.skills.length > 0) {
    parts.push(`Ferdigheter: ${resume.skills.slice(0, 30).join(", ")}`);
  }
  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    const exp = resume.experience
      .slice(0, 6)
      .map((e: Record<string, unknown>) => {
        const t = typeof e.title === "string" ? e.title : "";
        const c = typeof e.company === "string" ? e.company : "";
        const d = typeof e.description === "string" ? String(e.description).slice(0, 200) : "";
        return `- ${t} hos ${c}${d ? `: ${d}` : ""}`;
      })
      .join("\n");
    parts.push(`Erfaring:\n${exp}`);
  }
  if (Array.isArray(resume.education) && resume.education.length > 0) {
    const edu = resume.education
      .map((e: Record<string, unknown>) => {
        const deg = typeof e.degree === "string" ? e.degree : "";
        const field = typeof e.field === "string" ? e.field : "";
        const school = typeof e.school === "string" ? e.school : "";
        return `${deg}${field ? ` i ${field}` : ""}${school ? ` ved ${school}` : ""}`;
      })
      .join(", ");
    parts.push(`Utdanning: ${edu}`);
  }
  if (Array.isArray(resume.certifications) && resume.certifications.length > 0) {
    const certs = resume.certifications
      .map((c: Record<string, unknown>) =>
        typeof c.name === "string" ? c.name : "",
      )
      .filter(Boolean)
      .join(", ");
    if (certs) parts.push(`Sertifiseringer: ${certs}`);
  }
  return parts.join("\n\n");
}
