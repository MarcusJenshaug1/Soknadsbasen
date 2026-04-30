import type { ResumeData, ResumeEntry } from "@/store/useResumeStore";

interface PersistedResumePayload {
  resumes?: ResumeEntry[];
  activeResumeId?: string;
  _resumeDataMap?: Record<string, ResumeData>;
  data?: ResumeData;
}

/**
 * Unwrap persisted resume payload from DB.
 * Store saves: { resumes, activeResumeId, _resumeDataMap, data }
 * Legacy:      ResumeData at root
 */
export function parseActiveResume(raw: string | null | undefined): ResumeData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedResumePayload | ResumeData;
    if (parsed && typeof parsed === "object") {
      const p = parsed as PersistedResumePayload;
      if (p._resumeDataMap && p.activeResumeId && p._resumeDataMap[p.activeResumeId]) {
        return p._resumeDataMap[p.activeResumeId];
      }
      if (p.data && typeof p.data === "object") return p.data;
    }
    return parsed as ResumeData;
  } catch {
    return null;
  }
}

/**
 * Pick a specific resume by id from the persisted payload.
 * Returns null if the id is unknown (CV deleted) or payload malformed.
 * Used by share-link rendering: link binds to a specific resumeId, not the
 * currently active one.
 */
export function parseResumeById(
  raw: string | null | undefined,
  resumeId: string,
): ResumeData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedResumePayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed._resumeDataMap && parsed._resumeDataMap[resumeId]) {
      return parsed._resumeDataMap[resumeId];
    }
    // Legacy v1 single-CV payload — accept only if the requested id matches the
    // synthetic default id assigned at hydration time (see useCloudSync.ts).
    if (resumeId === "resume-default" && parsed.data && typeof parsed.data === "object") {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Bygg en kanonisk tekstversjon av et resume til AI-prompt + hash-cache.
 * Brukes både fra /api/ai/cv-keywords og /lib/jobs/match-cache så de ALDRI
 * drifter — hash må matche eksakt for at server-pre-fetch skal hit cache.
 */
export function buildResumeSummary(resume: Record<string, unknown>): string {
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

/**
 * List available CV ids + names from the persisted payload.
 * Used to validate POST /api/cv/share inputs and to label rows in the share-list UI.
 */
export function listResumesFromPayload(
  raw: string | null | undefined,
): Array<{ id: string; name: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PersistedResumePayload;
    if (parsed?.resumes?.length) {
      return parsed.resumes.map((r) => ({ id: r.id, name: r.name }));
    }
    if (parsed?._resumeDataMap) {
      return Object.keys(parsed._resumeDataMap).map((id) => ({ id, name: id }));
    }
    if (parsed?.data) {
      return [{ id: "resume-default", name: "Min CV" }];
    }
    return [];
  } catch {
    return [];
  }
}
