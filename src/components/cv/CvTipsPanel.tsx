"use client";

import { useEffect, useMemo, useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { savePendingTips, type CvTipsLink } from "@/lib/cv-pending-tips";
import { cn } from "@/lib/cn";

type CvTips = {
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

const SECTION_LABEL: Record<string, string> = {
  profile: "Profil",
  summary: "Profil",
  experience: "Erfaring",
  skills: "Ferdigheter",
  education: "Utdanning",
  role: "Rolle",
};

type CommonProps = {
  jobTitle: string;
  employerName: string;
  onClose: () => void;
};

type Props =
  | (CommonProps & { slug: string; applicationId?: never })
  | (CommonProps & { applicationId: string; slug?: never });

/**
 * AI-coach modal: henter tips fra /api/ai/cv-tips og lar bruker BÅDE
 * - bruke forslagene rett inn i Zustand (auto-fyller CV-en, cloud-sync
 *   plukker det opp og persisterer)
 * - åpne CV-bygger med samme tips i side-drawer for live-preview
 *
 * Aksepterer enten `slug` (offentlig /jobb-side) eller `applicationId`
 * (pipeline-detalj). API-et matcher mot Job-tabellen ved slug, eller mot
 * JobApplication.jobDescription ved id.
 */
export function CvTipsPanel(props: Props) {
  const { jobTitle, employerName, onClose } = props;
  const [tips, setTips] = useState<CvTips | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const data = useResumeStore((s) => s.data);
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const updateRole = useResumeStore((s) => s.updateRole);
  const updateSkills = useResumeStore((s) => s.updateSkills);

  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState<Set<string>>(new Set());

  const isApplied = (k: string) => applied.has(k);
  const isLocked = (k: string) => locked.has(k);
  const markApplied = (k: string) =>
    setApplied((s) => new Set(s).add(k));
  const toggleLock = (k: string) =>
    setLocked((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const addSkill = (kw: string) => {
    const key = `skill:${kw}`;
    if (isLocked(key)) return;
    const lower = data.skills.map((s) => s.toLowerCase());
    if (lower.includes(kw.toLowerCase())) {
      markApplied(key);
      return;
    }
    updateSkills([...data.skills, kw]);
    markApplied(key);
  };

  const applyRewrite = (key: string, section: string, suggested: string) => {
    if (isLocked(key)) return;
    if (section === "profile" || section === "summary") {
      updateSummary(suggested);
      markApplied(key);
    } else if (section === "role") {
      updateRole(suggested);
      markApplied(key);
    }
  };

  const requestKey = props.slug
    ? `slug:${props.slug}`
    : `application:${props.applicationId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const body = props.slug
      ? { slug: props.slug }
      : { applicationId: props.applicationId };
    fetch("/api/ai/cv-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        const payload = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(payload?.error ?? "Kunne ikke hente tips");
          return;
        }
        setTips(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ukjent feil");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // requestKey kapsler både slug og applicationId så vi ikke trenger begge i deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const skillCandidates = useMemo(
    () => (tips?.gaps ?? []).map((g) => g.keyword),
    [tips],
  );
  const allSkillsApplied =
    skillCandidates.length > 0 &&
    skillCandidates.every(
      (k) =>
        isApplied(`skill:${k}`) ||
        data.skills.map((s) => s.toLowerCase()).includes(k.toLowerCase()),
    );

  return (
    <div
      role="dialog"
      aria-label="CV-tips"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[640px] max-h-[88vh] overflow-y-auto rounded-2xl bg-bg shadow-2xl border border-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-black/8 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
              AI-coach
            </div>
            <h2 className="text-[18px] md:text-[20px] font-medium tracking-tight text-ink">
              Få hjelp med CV-en din
            </h2>
            <p className="text-[12px] text-[#14110e]/60 mt-1">
              Skreddersydd til {jobTitle} hos {employerName}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60 hover:text-ink transition-colors"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {loading && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-[13px] text-[#14110e]/65">
                <span className="inline-flex gap-[3px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
                AI leser CV-en din og sammenligner med stillingen …
              </div>
              <div className="space-y-2 animate-pulse">
                <div className="h-2.5 bg-panel rounded-full w-3/4" />
                <div className="h-2.5 bg-panel rounded-full w-5/6" />
                <div className="h-2.5 bg-panel rounded-full w-2/3" />
                <div className="h-2.5 bg-panel rounded-full w-4/5" />
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl bg-accent/10 border border-accent/30 px-4 py-3 text-[13px] text-accent">
              {error}
            </div>
          )}

          {tips && !loading && !error && (
            <>
              {/* Gaps med Legg til-knapp = den faktiske auto-fyll-funksjonen */}
              {skillCandidates.length > 0 && (
                <Section title="Hull å tette" tone="missing">
                  <p className="text-[12px] text-[#14110e]/60 mb-3">
                    Legg til hvert nøkkelord stillingen krever, eller alle på én gang.
                  </p>
                  <ul className="space-y-2">
                    {(tips.gaps ?? []).map((g) => {
                      const key = `skill:${g.keyword}`;
                      const alreadyHas = data.skills
                        .map((s) => s.toLowerCase())
                        .includes(g.keyword.toLowerCase());
                      const used = alreadyHas || isApplied(key);
                      const lock = isLocked(key);
                      return (
                        <li
                          key={g.keyword}
                          className={cn(
                            "rounded-xl border p-3",
                            used
                              ? "border-emerald-200/70 bg-emerald-50/50"
                              : lock
                                ? "border-black/10 bg-panel/50 opacity-60"
                                : "border-accent/20 bg-accent/5",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-[13px] text-ink mb-1">
                                {g.keyword}
                              </div>
                              {g.suggestion && (
                                <p className="text-[12px] text-[#14110e]/65 leading-[1.55]">
                                  {g.suggestion}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <LockButton
                                locked={lock}
                                onToggle={() => toggleLock(key)}
                              />
                              {used ? (
                                <span className="text-[11px] text-emerald-700 font-medium px-2.5 py-1.5">
                                  ✓ Lagt til
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addSkill(g.keyword)}
                                  disabled={lock}
                                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-accent text-bg hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  + Legg til
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {!allSkillsApplied && (
                    <button
                      type="button"
                      onClick={() => {
                        skillCandidates.forEach((k) => {
                          if (!isLocked(`skill:${k}`)) addSkill(k);
                        });
                      }}
                      className="mt-3 text-[12px] font-medium text-accent hover:underline underline-offset-2"
                    >
                      Legg til alle ulåste →
                    </button>
                  )}
                </Section>
              )}

              {/* Rewrites med Bruk på Profil/Rolle-knapp + Kopier */}
              {tips.rewrites && tips.rewrites.length > 0 && (
                <Section title="Foreslåtte omformuleringer">
                  <ul className="space-y-3">
                    {tips.rewrites.map((r, i) => {
                      const key = `rewrite:${i}`;
                      const used = isApplied(key);
                      const lock = isLocked(key);
                      const canAutoApply =
                        r.section === "profile" ||
                        r.section === "summary" ||
                        r.section === "role";
                      return (
                        <li
                          key={i}
                          className={cn(
                            "rounded-xl border p-3.5",
                            used
                              ? "border-emerald-200/70 bg-emerald-50/40"
                              : lock
                                ? "border-black/10 bg-panel/50 opacity-60"
                                : "border-black/10 bg-surface",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#14110e]/55">
                              <span>{SECTION_LABEL[r.section] ?? r.section}</span>
                              {r.reason && (
                                <span className="text-[#14110e]/40">· {r.reason}</span>
                              )}
                            </div>
                            <LockButton
                              locked={lock}
                              onToggle={() => toggleLock(key)}
                            />
                          </div>
                          <div className="text-[12px] text-[#14110e]/55 line-through italic mb-1.5">
                            {r.current}
                          </div>
                          <div className="text-[13px] text-ink leading-[1.55] flex gap-2 mb-3">
                            <span className="text-emerald-700 shrink-0">→</span>
                            <span>{r.suggested}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(r.suggested);
                                markApplied(key);
                              }}
                              disabled={lock}
                              className="text-[11px] px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 disabled:opacity-40"
                            >
                              Kopier
                            </button>
                            {canAutoApply && !used && (
                              <button
                                type="button"
                                onClick={() => applyRewrite(key, r.section, r.suggested)}
                                disabled={lock}
                                className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-accent text-bg hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Bruk på {(SECTION_LABEL[r.section] ?? r.section).toLowerCase()}
                              </button>
                            )}
                            {used && (
                              <span className="text-[11px] text-emerald-700 font-medium px-2.5 py-1.5">
                                ✓ Brukt
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {/* Strengths (info-only) */}
              {tips.strengths && tips.strengths.length > 0 && (
                <Section title="Styrker du bør fremheve" tone="match">
                  <ul className="space-y-2">
                    {tips.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-[13px] text-[#14110e]/85 leading-[1.55]"
                      >
                        <span className="text-emerald-700 shrink-0">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Additions (mark as "tatt") */}
              {tips.additions && tips.additions.length > 0 && (
                <Section title="Nye seksjoner å vurdere">
                  <ul className="space-y-2">
                    {tips.additions.map((a, i) => {
                      const key = `addition:${i}`;
                      const used = isApplied(key);
                      return (
                        <li
                          key={i}
                          className={cn(
                            "flex items-start justify-between gap-3 rounded-xl border p-3",
                            used
                              ? "border-emerald-200/70 bg-emerald-50/40"
                              : "border-black/10 bg-surface",
                          )}
                        >
                          <span className="text-[13px] text-[#14110e]/85 leading-[1.55] flex gap-2">
                            <span className="text-accent shrink-0">+</span>
                            <span>{a}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => markApplied(key)}
                            className={cn(
                              "text-[11px] px-2.5 py-1.5 rounded-full shrink-0",
                              used
                                ? "text-emerald-700 font-medium"
                                : "text-[#14110e]/65 hover:text-ink hover:bg-black/5",
                            )}
                          >
                            {used ? "✓ Tatt" : "Marker tatt"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>

        {!loading && !error && tips && (
          <div className="sticky bottom-0 bg-bg/95 backdrop-blur-sm border-t border-black/8 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-[#14110e]/50">
              Endringer lagres automatisk. Tips er forslag, ikke kommandoer.
            </span>
            <button
              type="button"
              onClick={() => {
                const link: CvTipsLink =
                  "slug" in props && props.slug
                    ? { kind: "job", slug: props.slug }
                    : { kind: "application", applicationId: props.applicationId! };
                savePendingTips({ link, jobTitle, employerName, tips });
                window.location.href = "/app/cv";
              }}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium hover:bg-[#2a2520] transition-colors"
            >
              Åpne CV-bygger med live-preview
              <span aria-hidden>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "match" | "missing";
}) {
  const dot =
    tone === "match"
      ? "bg-emerald-600"
      : tone === "missing"
        ? "bg-accent"
        : "bg-[#14110e]/40";
  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/65 mb-2.5 flex items-center gap-2">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function LockButton({
  locked,
  onToggle,
}: {
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={locked ? "Lås opp" : "Lås, ikke tillat endring"}
      aria-label={locked ? "Lås opp forslag" : "Lås forslag"}
      className={cn(
        "size-7 rounded-full flex items-center justify-center transition-colors",
        locked
          ? "bg-[#14110e]/10 text-ink"
          : "text-[#14110e]/40 hover:bg-black/5 hover:text-[#14110e]/70",
      )}
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {locked ? (
          <>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </>
        ) : (
          <>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 7-2.65" />
          </>
        )}
      </svg>
    </button>
  );
}
