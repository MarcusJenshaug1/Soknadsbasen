"use client";

import { useEffect, useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import {
  clearPendingTips,
  readPendingTips,
  type CvTipsPayload,
} from "@/lib/cv-pending-tips";
import { cn } from "@/lib/cn";

const SECTION_LABEL: Record<string, string> = {
  profile: "Profil",
  summary: "Profil",
  experience: "Erfaring",
  skills: "Ferdigheter",
  education: "Utdanning",
};

type AppliedSet = Set<string>;
type LockedSet = Set<string>;

export function PendingCvTipsDrawer() {
  const data = useResumeStore((s) => s.data);
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const updateRole = useResumeStore((s) => s.updateRole);
  const updateSkills = useResumeStore((s) => s.updateSkills);

  const [payload, setPayload] = useState<CvTipsPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<AppliedSet>(new Set());
  const [locked, setLocked] = useState<LockedSet>(new Set());

  // Last fra sessionStorage på mount
  useEffect(() => {
    const p = readPendingTips();
    if (p) {
      setPayload(p);
      setOpen(true);
    }
  }, []);

  if (!payload || !open) return null;

  const { tips, jobTitle, employerName, slug } = payload;

  const close = () => {
    setOpen(false);
  };

  const dismissAll = () => {
    clearPendingTips();
    setOpen(false);
    setPayload(null);
  };

  const isApplied = (key: string) => applied.has(key);
  const isLocked = (key: string) => locked.has(key);

  const markApplied = (key: string) => {
    setApplied((s) => new Set(s).add(key));
  };
  const toggleLock = (key: string) => {
    setLocked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
    // For erfaring/utdanning kan vi ikke auto-target uten ID — bruker
    // kopierer manuelt og markerer som tatt
  };

  const addSkill = (kw: string) => {
    if (isLocked(`skill:${kw}`)) return;
    const lower = data.skills.map((s) => s.toLowerCase());
    if (lower.includes(kw.toLowerCase())) {
      markApplied(`skill:${kw}`);
      return;
    }
    updateSkills([...data.skills, kw]);
    markApplied(`skill:${kw}`);
  };

  const skillCandidates = (tips.gaps ?? []).map((g) => g.keyword);
  const allSkillsApplied =
    skillCandidates.length > 0 &&
    skillCandidates.every(
      (k) =>
        isApplied(`skill:${k}`) ||
        data.skills.map((s) => s.toLowerCase()).includes(k.toLowerCase()),
    );

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={close}
      />
      <aside
        role="dialog"
        aria-label="Forslag fra AI-coach"
        className="fixed right-0 top-0 z-50 h-dvh w-full sm:w-[440px] md:w-[520px] bg-bg shadow-2xl border-l border-black/10 flex flex-col"
      >
        <header className="border-b border-black/8 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
              AI-coach
            </div>
            <h2 className="text-[16px] md:text-[18px] font-medium tracking-tight text-ink">
              Forslag for {jobTitle}
            </h2>
            <p className="text-[12px] text-[#14110e]/55 mt-0.5 truncate">
              {employerName}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Lukk forslag"
            className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60 hover:text-ink transition-colors shrink-0"
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
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* Skills (gaps) */}
          {skillCandidates.length > 0 && (
            <Section
              title="Foreslåtte ferdigheter"
              count={skillCandidates.length}
              tone="missing"
            >
              <p className="text-[12px] text-[#14110e]/60 mb-3">
                Legg til hvert nøkkelord stillingen krever, eller alle på én gang.
              </p>
              <ul className="space-y-2">
                {skillCandidates.map((kw) => {
                  const key = `skill:${kw}`;
                  const alreadyHas = data.skills
                    .map((s) => s.toLowerCase())
                    .includes(kw.toLowerCase());
                  const used = alreadyHas || isApplied(key);
                  const lock = isLocked(key);
                  const gap = (tips.gaps ?? []).find((g) => g.keyword === kw);
                  return (
                    <li
                      key={kw}
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
                            {kw}
                          </div>
                          {gap?.suggestion && (
                            <p className="text-[12px] text-[#14110e]/65 leading-[1.55]">
                              {gap.suggestion}
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
                              onClick={() => addSkill(kw)}
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

          {/* Rewrites */}
          {tips.rewrites && tips.rewrites.length > 0 && (
            <Section title="Foreslåtte omformuleringer" count={tips.rewrites.length}>
              <ul className="space-y-3">
                {tips.rewrites.map((r, i) => {
                  const key = `rewrite:${i}`;
                  const used = isApplied(key);
                  const lock = isLocked(key);
                  const canAutoApply =
                    r.section === "profile" || r.section === "summary";
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
                            Bruk på {SECTION_LABEL[r.section]?.toLowerCase()}
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
            <Section title="Styrker du har" tone="match" count={tips.strengths.length}>
              <ul className="space-y-2">
                {tips.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-[13px] text-[#14110e]/85 leading-[1.55]"
                  >
                    <span className="text-emerald-700 shrink-0">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Additions */}
          {tips.additions && tips.additions.length > 0 && (
            <Section title="Vurder å legge til" count={tips.additions.length}>
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
        </div>

        <footer className="border-t border-black/8 px-5 py-3.5 flex items-center justify-between gap-3 bg-bg/95">
          <a
            href={`/jobb/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-[#14110e]/55 hover:text-ink"
          >
            Se stillingen ↗
          </a>
          <button
            type="button"
            onClick={dismissAll}
            className="text-[12px] font-medium px-4 py-2 rounded-full bg-ink text-bg hover:bg-[#2a2520]"
          >
            Ferdig
          </button>
        </footer>
      </aside>
    </>
  );
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count?: number;
  tone?: "match" | "missing";
  children: React.ReactNode;
}) {
  const dot =
    tone === "match"
      ? "bg-emerald-600"
      : tone === "missing"
        ? "bg-accent"
        : "bg-[#14110e]/40";
  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/65 mb-3 flex items-center gap-2">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
        <span>{title}</span>
        {typeof count === "number" && (
          <span className="text-[#14110e]/35 normal-case tracking-normal">
            ({count})
          </span>
        )}
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
      title={locked ? "Lås opp" : "Lås — ikke tillat endring"}
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
