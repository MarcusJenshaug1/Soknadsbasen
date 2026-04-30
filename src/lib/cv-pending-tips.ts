export type CvTipsPayload = {
  slug: string;
  jobTitle: string;
  employerName: string;
  tips: {
    strengths?: string[];
    gaps?: { keyword: string; suggestion: string }[];
    rewrites?: {
      section: string;
      current: string;
      suggested: string;
      reason?: string;
    }[];
    additions?: string[];
  };
  savedAt: number;
};

const KEY = "cv-pending-tips";

export function savePendingTips(payload: Omit<CvTipsPayload, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...payload, savedAt: Date.now() }),
    );
  } catch {
    // sessionStorage utilgjengelig (privat modus etc.) — ignorer
  }
}

export function readPendingTips(): CvTipsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CvTipsPayload;
  } catch {
    return null;
  }
}

export function clearPendingTips() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
