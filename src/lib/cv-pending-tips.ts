export type CvTipsLink =
  | { kind: "job"; slug: string }
  | { kind: "application"; applicationId: string };

export type CvTipsPayload = {
  /** Lenkemål for "Se stillingen"-knappen i drawer. Null = ingen lenke. */
  link: CvTipsLink | null;
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
  /** @deprecated: gammel form, leses kun for bakover-kompatibilitet. */
  slug?: string;
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
    const parsed = JSON.parse(raw) as CvTipsPayload;
    // Migrer gammelt format der `slug` var top-level og `link` manglet.
    if (!parsed.link && parsed.slug) {
      parsed.link = { kind: "job", slug: parsed.slug };
    }
    return parsed;
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

export function tipsLinkHref(link: CvTipsLink | null): string | null {
  if (!link) return null;
  if (link.kind === "job") return `/jobb/${link.slug}`;
  return `/app/pipeline/${link.applicationId}`;
}
