import type { ResumeData } from "@/store/useResumeStore";

/**
 * Unwrap persisted resume payload from DB.
 * Store saves: { resumes, activeResumeId, _resumeDataMap, data }
 * Legacy:      ResumeData at root
 */
export function parseActiveResume(raw: string | null | undefined): ResumeData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as
      | {
          activeResumeId?: string;
          _resumeDataMap?: Record<string, ResumeData>;
          data?: ResumeData;
        }
      | ResumeData;
    if (parsed && typeof parsed === "object") {
      const p = parsed as {
        activeResumeId?: string;
        _resumeDataMap?: Record<string, ResumeData>;
        data?: ResumeData;
      };
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
