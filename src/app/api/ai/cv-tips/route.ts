import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiGenerate } from "@/lib/gemini";
import { parseLooseJson } from "@/lib/json";
import { parseActiveResume } from "@/lib/resume-server";

/**
 * POST /api/ai/cv-tips
 * Body: { slug?: string }
 * Returns: { strengths, gaps, rewrites, additions }
 *
 * Gir konkrete forbedringstips for brukerens CV. Hvis slug oppgis,
 * skreddersys tips mot den spesifikke stillingen (hva som mangler,
 * hva som bør fremheves). Uten slug = generelle tips.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { slug?: string };

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });
  const resume = parseActiveResume(userData?.resumeData);
  if (!resume) {
    return NextResponse.json(
      { error: "Ingen CV-data funnet. Fyll ut CV-en din først." },
      { status: 400 },
    );
  }

  const cvText = buildResumeSummary(resume as unknown as Record<string, unknown>);

  let jobContext = "";
  if (body.slug) {
    const job = await prisma.job.findUnique({
      where: { slug: body.slug },
      select: {
        title: true,
        jobTitle: true,
        employerName: true,
        employerDescription: true,
        description: true,
        location: true,
        region: true,
        category: true,
        occupation: true,
        engagementType: true,
        extent: true,
        sector: true,
        remote: true,
        workhours: true,
        workdays: true,
        starttime: true,
        positionCount: true,
        workLanguages: true,
        contactTitle: true,
        aiKeywords: true,
      },
    });
    if (job) {
      const ansettelse = [job.engagementType, job.extent]
        .filter((v): v is string => Boolean(v))
        .join(" · ");
      const sted = [job.location, job.region]
        .filter((v): v is string => Boolean(v))
        .join(", ");
      jobContext = [
        `STILLING: ${job.title}`,
        job.jobTitle && job.jobTitle !== job.title
          ? `Formell tittel: ${job.jobTitle}`
          : "",
        `Selskap: ${job.employerName}`,
        sted ? `Sted: ${sted}` : "",
        ansettelse ? `Ansettelse: ${ansettelse}` : "",
        job.sector ? `Sektor: ${job.sector}` : "",
        job.remote ? `Hjemmekontor: ${job.remote}` : "",
        job.workhours ? `Arbeidstid: ${job.workhours}` : "",
        job.workdays ? `Arbeidsdager: ${job.workdays}` : "",
        job.starttime ? `Oppstart: ${job.starttime}` : "",
        job.positionCount && job.positionCount > 1
          ? `Antall stillinger: ${job.positionCount}`
          : "",
        Array.isArray(job.workLanguages) && job.workLanguages.length > 0
          ? `Arbeidsspråk: ${job.workLanguages.join(", ")}`
          : "",
        job.category ? `Kategori: ${job.category}` : "",
        job.occupation && job.occupation !== job.category
          ? `Yrkestittel: ${job.occupation}`
          : "",
        job.contactTitle ? `Kontaktperson rolle: ${job.contactTitle}` : "",
        job.aiKeywords.length > 0
          ? `Nøkkelord stillingen krever: ${job.aiKeywords.join(", ")}`
          : "",
        job.employerDescription
          ? `Om arbeidsgiver:\n${job.employerDescription.replace(/<[^>]+>/g, " ").slice(0, 800)}`
          : "",
        job.description
          ? `Stillingsbeskrivelse:\n${job.description.replace(/<[^>]+>/g, " ").slice(0, 4000)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
  }

  const system = `Du er en CV-coach for det norske arbeidsmarkedet. Gi konkrete, handlekraftige tips for å forbedre kandidatens CV. Returner GYLDIG JSON.

SCHEMA:
{
  "strengths": ["string"],
  "gaps": [{ "keyword": "string", "suggestion": "string" }],
  "rewrites": [{ "section": "profile" | "experience" | "skills" | "education" | "summary", "current": "string", "suggested": "string", "reason": "string" }],
  "additions": ["string"]
}

REGLER:
- strengths: 2-4 punkter som er bra (det kandidaten kan fremheve mer).
- gaps: 0-6 nøkkelord eller kompetanse som mangler. For hver: konkret forslag (f.eks. "legg til Java-prosjekt fra studietiden" eller "fremhev backend-erfaring fra Eiendomsavtaler"). Tom array om ingen relevante gaps.
- rewrites: 1-4 forslag til bedre formuleringer av eksisterende tekst. Inkluder current (sitat fra CV) og suggested (forbedret versjon). Gi reason kort (f.eks. "Mer konkret", "Kvantifisert resultat").
- additions: 0-3 nye seksjoner/punkter kandidaten bør vurdere (f.eks. "Legg til prosjekter-seksjon med Søknadsbasen", "Legg til sertifisering"). Tom array om CV er komplett.
- Skriv på norsk. Vær konkret og handlekraftig — ikke generiske råd.
- Hvis stilling oppgis: prioriter tips som øker match mot DEN stillingen.
- Returner KUN JSON. Ingen markdown, ingen forklaring.`;

  const userPrompt = jobContext
    ? `=== KANDIDATENS CV ===\n${cvText}\n\n=== ${jobContext}\n=== SLUTT ===`
    : `=== KANDIDATENS CV ===\n${cvText}\n=== SLUTT ===`;

  try {
    const raw = await geminiGenerate(userPrompt, {
      system,
      temperature: 0.3,
      maxOutputTokens: 2000,
      json: true,
    });
    const parsed = parseLooseJson(raw);
    return NextResponse.json(parsed);
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
    parts.push(`Tittel: ${resume.role}`);
  }
  if (typeof resume.summary === "string" && resume.summary.trim()) {
    parts.push(`Profil: ${String(resume.summary).slice(0, 800)}`);
  }
  if (Array.isArray(resume.skills) && resume.skills.length > 0) {
    parts.push(`Ferdigheter: ${resume.skills.join(", ")}`);
  }
  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    const exp = resume.experience
      .map((e: Record<string, unknown>) => {
        const t = typeof e.title === "string" ? e.title : "";
        const c = typeof e.company === "string" ? e.company : "";
        const start = typeof e.startDate === "string" ? e.startDate : "";
        const end = typeof e.endDate === "string" ? e.endDate : (e.endDate ? "" : "Nå");
        const d = typeof e.description === "string" ? String(e.description).slice(0, 500) : "";
        return `- ${t} hos ${c} (${start}-${end})${d ? `: ${d}` : ""}`;
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
        const d = typeof e.description === "string" ? String(e.description).slice(0, 200) : "";
        return `- ${deg}${field ? ` i ${field}` : ""}${school ? ` ved ${school}` : ""}${d ? `: ${d}` : ""}`;
      })
      .join("\n");
    parts.push(`Utdanning:\n${edu}`);
  }
  if (Array.isArray(resume.projects) && resume.projects.length > 0) {
    parts.push(
      `Prosjekter: ${resume.projects
        .map((p: Record<string, unknown>) => (typeof p.name === "string" ? p.name : ""))
        .filter(Boolean)
        .join(", ")}`,
    );
  } else {
    parts.push("Prosjekter: (ingen)");
  }
  if (Array.isArray(resume.certifications) && resume.certifications.length > 0) {
    parts.push(
      `Sertifiseringer: ${resume.certifications
        .map((c: Record<string, unknown>) => (typeof c.name === "string" ? c.name : ""))
        .filter(Boolean)
        .join(", ")}`,
    );
  } else {
    parts.push("Sertifiseringer: (ingen)");
  }
  return parts.join("\n\n");
}
