"use client";

import { useEffect, useState } from "react";
import { savePendingTips } from "@/lib/cv-pending-tips";

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
  experience: "Erfaring",
  skills: "Ferdigheter",
  education: "Utdanning",
  summary: "Sammendrag",
};

export function CvTipsPanel({
  slug,
  jobTitle,
  employerName,
  onClose,
}: {
  slug: string;
  jobTitle: string;
  employerName: string;
  onClose: () => void;
}) {
  const [tips, setTips] = useState<CvTips | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ai/cv-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
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
  }, [slug]);

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
              Skreddersydd til denne stillingen.
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
              <Section title="Styrker du bør fremheve" tone="match">
                {tips.strengths && tips.strengths.length > 0 ? (
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
                ) : (
                  <p className="text-[12px] text-[#14110e]/55 italic">
                    Ingen åpenbare styrker funnet.
                  </p>
                )}
              </Section>

              {tips.gaps && tips.gaps.length > 0 && (
                <Section title="Hull å tette" tone="missing">
                  <ul className="space-y-3">
                    {tips.gaps.map((g, i) => (
                      <li
                        key={i}
                        className="rounded-xl bg-accent/5 border border-accent/15 p-3"
                      >
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-medium mb-1.5">
                          {g.keyword}
                        </div>
                        <p className="text-[13px] text-[#14110e]/85 leading-[1.5]">
                          {g.suggestion}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {tips.rewrites && tips.rewrites.length > 0 && (
                <Section title="Foreslåtte omformuleringer">
                  <ul className="space-y-3">
                    {tips.rewrites.map((r, i) => (
                      <li
                        key={i}
                        className="rounded-xl bg-surface border border-black/8 p-3.5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-[#14110e]/55">
                            {SECTION_LABEL[r.section] ?? r.section}
                          </span>
                          {r.reason && (
                            <span className="text-[10px] text-[#14110e]/45">
                              · {r.reason}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[#14110e]/55 line-through mb-1.5 italic">
                          {r.current}
                        </div>
                        <div className="text-[13px] text-ink leading-[1.55] flex gap-2">
                          <span className="text-emerald-700 shrink-0">→</span>
                          <span>{r.suggested}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {tips.additions && tips.additions.length > 0 && (
                <Section title="Nye seksjoner å vurdere">
                  <ul className="space-y-2">
                    {tips.additions.map((a, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-[13px] text-[#14110e]/85 leading-[1.55]"
                      >
                        <span className="text-accent shrink-0">+</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>

        {!loading && !error && tips && (
          <div className="sticky bottom-0 bg-bg/95 backdrop-blur-sm border-t border-black/8 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-[#14110e]/50">
              Tips er AI-genererte forslag, ikke kommandoer.
            </span>
            <button
              type="button"
              onClick={() => {
                savePendingTips({ slug, jobTitle, employerName, tips });
                window.location.href = "/app/cv";
              }}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Åpne CV-bygger med forslag
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
