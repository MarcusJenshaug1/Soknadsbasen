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
