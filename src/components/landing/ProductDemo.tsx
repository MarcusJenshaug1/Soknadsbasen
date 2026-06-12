"use client";

import * as React from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  FileText,
  Sparkles,
  Star,
  BarChart3,
  ClipboardPaste,
  PenLine,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Chapter = "cv" | "jobb" | "soknad";
type Step = {
  chapter: Chapter;
  label: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number;
};

// Én jobbsøkers reise: samme stilling (Produktdesigner, Nordisk Studio, Oslo,
// frist 14. mai) følges gjennom CV → Jobb → Søknad, slik produktet faktisk
// brukes. Scenene speiler ekte UI: maler fra design-tokens, match-piller og
// faktor-barer fra jobb-modulen, kanban fra pipelinen.
const STEPS: Step[] = [
  { chapter: "cv", label: "Velg mal", caption: "Åtte maler, alle ATS-vennlige. Én blir din.", icon: FileText, duration: 2400 },
  { chapter: "cv", label: "AI skriver, du styrer", caption: "Velg tone. Forhåndsvisningen følger med mens teksten blir til.", icon: Sparkles, duration: 3400 },
  { chapter: "jobb", label: "Stillinger matchet mot CV-en", caption: "Hele Norge, oppdatert hver time, sortert etter hva som passer deg.", icon: Star, duration: 3000 },
  { chapter: "jobb", label: "Se hvorfor det matcher", caption: "Ferdigheter, yrkesretning og erfaring, regnet ut fra CV-en din.", icon: BarChart3, duration: 2800 },
  { chapter: "soknad", label: "AI leser annonsen", caption: "Firma, tittel, sted og frist, hentet ut automatisk.", icon: ClipboardPaste, duration: 3200 },
  { chapter: "soknad", label: "Utkast til søknadsbrev", caption: "AI skriver førsteutkastet. Du gjør det til ditt.", icon: PenLine, duration: 2800 },
  { chapter: "soknad", label: "Full oversikt, ingen glemte frister", caption: "Kladd. Sendt. Intervju. Tilbud. Og oppgaver med frist.", icon: LayoutGrid, duration: 3200 },
];

const CHAPTERS: { id: Chapter; title: string }[] = [
  { id: "cv", title: "CV" },
  { id: "jobb", title: "Jobb" },
  { id: "soknad", title: "Søknad" },
];

const TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };
const SPRING = { type: "spring", stiffness: 280, damping: 32 } as const;

function useTypewriter(text: string, charsPerTick: number, tickMs: number): string {
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => {
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += charsPerTick;
      if (i >= text.length) {
        setTyped(text);
        clearInterval(id);
      } else {
        setTyped(text.slice(0, i));
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [text, charsPerTick, tickMs]);
  return typed;
}

function useCountUp(target: number, durationMs: number, delayMs: number): number {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    setValue(0);
    let id: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      const t0 = performance.now();
      id = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / durationMs);
        setValue(Math.round(target * (1 - (1 - p) ** 3)));
        if (p >= 1 && id) clearInterval(id);
      }, 40);
    }, delayMs);
    return () => {
      clearTimeout(start);
      if (id) clearInterval(id);
    };
  }, [target, durationMs, delayMs]);
  return value;
}

export default function ProductDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  // Bump ved resume: fremdriftsfyllet remountes i synk med den restartede
  // step-timeren — ellers fullfører fyllet før steget faktisk bytter.
  const [epoch, setEpoch] = React.useState(0);

  React.useEffect(() => {
    if (reduce || !inView || paused) return;
    setEpoch((e) => e + 1);
    const t = setTimeout(
      () => setIndex((i) => (i + 1) % STEPS.length),
      STEPS[index].duration,
    );
    return () => clearTimeout(t);
  }, [index, inView, paused, reduce]);

  if (reduce) return <ProductDemoStatic />;

  const step = STEPS[index];

  return (
    <section
      aria-label="Produktdemo"
      className="max-w-[1200px] mx-auto px-5 md:px-10 pb-20 md:pb-32"
    >
      <div
        ref={ref}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="bg-panel rounded-[24px] md:rounded-[32px] p-5 md:p-10 relative overflow-hidden"
      >
        <div className="flex min-h-[28px] items-center justify-between mb-6 md:mb-8">
          <div
            className="flex items-center gap-4 md:gap-5"
            role="tablist"
            aria-label="Demo-steg"
          >
            {CHAPTERS.map((ch) => {
              const chapterSteps = STEPS.filter((s) => s.chapter === ch.id);
              const chapterActive = step.chapter === ch.id;
              return (
                <div key={ch.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-[0.2em] transition-colors",
                      chapterActive ? "text-ink" : "text-ink-faint",
                    )}
                  >
                    {ch.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {chapterSteps.map((s) => {
                      const absoluteIdx = STEPS.indexOf(s);
                      const active = absoluteIdx === index;
                      return (
                        <button
                          key={s.label}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-label={`Gå til steg ${absoluteIdx + 1}: ${s.label}`}
                          onClick={() => setIndex(absoluteIdx)}
                          className={cn(
                            "relative h-1 overflow-hidden rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel",
                            active
                              ? "w-8 bg-ink/20"
                              : "w-4 bg-ink/20 hover:bg-ink/40",
                          )}
                        >
                          {active && (
                            <span
                              key={`${index}-${epoch}`}
                              className="absolute inset-0 origin-left rounded-full bg-ink"
                              style={{
                                animation: `demo-progress ${s.duration}ms linear forwards`,
                                animationPlayState:
                                  paused || !inView ? "paused" : "running",
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-faint hidden md:block">
            Live demo
          </span>
        </div>

        <LayoutGroup>
          <div className="relative min-h-[420px] md:min-h-[480px]">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={TRANSITION}
                className="absolute inset-0"
              >
                <StepScene index={index} />
              </motion.div>
            </AnimatePresence>
          </div>
        </LayoutGroup>

        <div className="mt-6 md:mt-8 flex items-start gap-3 min-h-[44px]">
          <step.icon className="w-4 h-4 mt-0.5 text-accent shrink-0" />
          <AnimatePresence mode="wait">
            <motion.div
              key={`cap-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-[14px] md:text-[15px] font-medium text-ink">
                {step.label}
              </div>
              <div className="text-[12px] md:text-[13px] text-ink-soft">
                {step.caption}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ol className="sr-only">
        {STEPS.map((s) => (
          <li key={s.label}>
            {CHAPTERS.find((c) => c.id === s.chapter)?.title}: {s.label}. {s.caption}
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepScene({ index }: { index: number }) {
  switch (index) {
    case 0: return <CvTemplates />;
    case 1: return <CvEditorScene />;
    case 2: return <JobbMatchScene />;
    case 3: return <MatchWhyScene />;
    case 4: return <SoknadAnalyzeScene />;
    case 5: return <BrevScene />;
    case 6: return <SoknadPipeline />;
    default: return null;
  }
}

function SceneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full bg-surface rounded-2xl border border-black/5 dark:border-white/5 p-5 md:p-8 overflow-hidden">
      {children}
    </div>
  );
}

function SceneTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-4">
      {children}
    </div>
  );
}

// ─── Kapittel CV ─────────────────────────────────────────

function CvTemplates() {
  // Reelle malnavn fra design-tokens (CV_TEMPLATES).
  const templates = ["ATS Clean", "Modern Professional", "Modern Minimal", "Two-Column"];
  const selected = 1;
  return (
    <SceneFrame>
      <SceneTitle>Velg mal</SceneTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {templates.map((t, i) => {
          const isSelected = i === selected;
          const card = (
            <>
              <div className="h-1.5 w-12 rounded-full bg-ink/70" />
              <div className="h-1 w-8 rounded-full bg-ink/20 mb-2" />
              <div className="h-0.5 w-full rounded-full bg-ink/10" />
              <div className="h-0.5 w-4/5 rounded-full bg-ink/10" />
              <div className="h-0.5 w-3/5 rounded-full bg-ink/10" />
              <div className="mt-auto text-[10px] text-ink-soft">{t}</div>
            </>
          );
          return (
            <motion.div
              key={t}
              layoutId={isSelected ? "cv-doc" : undefined}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.08 * i }}
              className={cn(
                "relative aspect-[3/4] rounded-xl border bg-bg p-3 flex flex-col gap-1.5",
                isSelected
                  ? "border-accent ring-2 ring-accent/20"
                  : "border-black/10 dark:border-white/10",
              )}
            >
              {card}
            </motion.div>
          );
        })}
      </div>
    </SceneFrame>
  );
}

function CvEditorScene() {
  const tones = ["Varm", "Formell", "Konsis"];
  const fullText =
    "Produktdesigner med syv års erfaring fra nordiske SaaS-selskaper. Trygg i grenselandet mellom research, interaksjon og systemtenkning.";
  const typed = useTypewriter(fullText, 2, 28);
  const progress = typed.length / fullText.length;
  // Preview-linjene «fylles» i takt med typingen.
  const lines = [0.15, 0.35, 0.55, 0.75, 0.9];
  return (
    <SceneFrame>
      <div className="grid grid-cols-5 gap-5 md:gap-6 h-full">
        <div className="col-span-5 md:col-span-2">
          <SceneTitle>Profiltekst</SceneTitle>
          <div className="flex items-center gap-1.5 mb-4 bg-panel rounded-full p-1 w-fit">
            {tones.map((tone, i) => (
              <div
                key={tone}
                className={cn(
                  "px-3 py-1 rounded-full text-[12px]",
                  i === 0 ? "bg-surface text-ink font-medium" : "text-ink-soft",
                )}
              >
                {tone}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-bg p-4 min-h-[150px] text-[13px] leading-[1.6] text-ink/85">
            {typed}
            <span className="inline-block w-px h-[1em] align-middle bg-accent ml-0.5 animate-pulse" />
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-ink text-bg rounded-full px-3 py-1 text-[12px]">
            <Sparkles className="w-3 h-3" /> Generer
          </div>
        </div>
        <motion.div
          layoutId="cv-doc"
          transition={SPRING}
          className="col-span-5 md:col-span-3 rounded-lg border border-black/10 bg-white shadow-sm p-4 md:p-6"
        >
          <div className="h-2 w-32 rounded-full bg-[#14110e] mb-1" />
          <div className="h-1.5 w-24 rounded-full bg-accent mb-5" />
          <div className="space-y-1.5 mb-4">
            {lines.map((threshold, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-[#14110e]/15 transition-all duration-300"
                style={{
                  width: `${[100, 92, 80, 70, 55][i]}%`,
                  opacity: progress > threshold ? 1 : 0.15,
                }}
              />
            ))}
          </div>
          <div className="h-1.5 w-20 rounded-full bg-[#14110e]/70 mb-2" />
          <div className="space-y-1.5 mb-4">
            <div className="h-1 w-full rounded-full bg-[#14110e]/10" />
            <div className="h-1 w-3/4 rounded-full bg-[#14110e]/10" />
          </div>
          <div className="h-1.5 w-16 rounded-full bg-[#14110e]/70 mb-2" />
          <div className="space-y-1.5">
            <div className="h-1 w-5/6 rounded-full bg-[#14110e]/10" />
            <div className="h-1 w-2/3 rounded-full bg-[#14110e]/10" />
          </div>
        </motion.div>
      </div>
    </SceneFrame>
  );
}

// ─── Kapittel Jobb ───────────────────────────────────────

const DEMO_JOBS = [
  { title: "Produktdesigner", employer: "Nordisk Studio", place: "Oslo", score: 72 },
  { title: "Senior produktdesigner", employer: "Fjellkraft AS", place: "Trondheim", score: 65 },
  { title: "UX-designer", employer: "Branda AS", place: "Bergen", score: 41 },
];

function MatchPill({ score, delayMs }: { score: number; delayMs: number }) {
  const value = useCountUp(score, 700, delayMs);
  const hoy = score >= 50;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING, delay: delayMs / 1000 }}
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-semibold",
        hoy ? "bg-success-soft text-success-ink" : "bg-accent-soft text-accent-ink",
      )}
    >
      {hoy ? "Høy match" : "Middels match"}
      <span className="font-medium tabular-nums opacity-70">{value}</span>
    </motion.span>
  );
}

function JobbMatchScene() {
  return (
    <SceneFrame>
      <SceneTitle>Anbefalt for deg</SceneTitle>
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-bg px-3.5 py-2.5 mb-4 flex items-center gap-2 text-[12px] text-ink-faint">
        <span className="w-3 h-3 rounded-full border border-current opacity-60" aria-hidden />
        Søk i 19 000 ledige stillinger
      </div>
      <div className="space-y-2.5">
        {DEMO_JOBS.map((j, i) => {
          const top = i === 0;
          return (
            <motion.div
              key={j.title}
              layoutId={top ? "job-card" : undefined}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.12 * i }}
              className={cn(
                "rounded-xl border bg-surface px-4 py-3 flex items-center gap-3",
                top
                  ? "border-accent ring-2 ring-accent/15"
                  : "border-black/10 dark:border-white/10",
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center text-[12px] font-semibold text-ink-soft shrink-0">
                {j.employer[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink truncate">{j.title}</div>
                <div className="text-[11.5px] text-ink-muted truncate">
                  {j.employer} · {j.place}
                </div>
              </div>
              <MatchPill score={j.score} delayMs={250 + i * 150} />
            </motion.div>
          );
        })}
      </div>
    </SceneFrame>
  );
}

const MATCH_FACTORS = [
  { label: "Ferdigheter", level: "Sterk", width: 0.9 },
  { label: "Yrkesretning", level: "Sterk", width: 0.85 },
  { label: "Erfaring", level: "Delvis", width: 0.55 },
  { label: "Språk", level: "Sterk", width: 0.95 },
];

function MatchWhyScene() {
  return (
    <SceneFrame>
      <SceneTitle>Hvorfor det matcher</SceneTitle>
      <motion.div
        layoutId="job-card"
        transition={SPRING}
        className="rounded-xl border border-accent ring-2 ring-accent/15 bg-surface px-4 py-3 flex items-center gap-3 mb-6"
      >
        <div className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center text-[12px] font-semibold text-ink-soft shrink-0">
          N
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-ink">Produktdesigner</div>
          <div className="text-[11.5px] text-ink-muted">Nordisk Studio · Oslo · Frist 14. mai</div>
        </div>
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-success-soft px-2.5 text-[10.5px] font-semibold text-success-ink">
          Høy match <span className="font-medium tabular-nums opacity-70">72</span>
        </span>
      </motion.div>
      <div className="space-y-4 max-w-[440px]">
        {MATCH_FACTORS.map((f, i) => (
          <div key={f.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-ink-soft">{f.label}</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.45 + 0.15 * i }}
                className="text-[11px] font-medium text-ink"
              >
                {f.level}
              </motion.span>
            </div>
            <div className="h-[5px] rounded-full bg-panel overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: f.width }}
                transition={{ ...TRANSITION, duration: 0.7, delay: 0.2 + 0.15 * i }}
                className="h-full origin-left rounded-full bg-ink"
              />
            </div>
          </div>
        ))}
      </div>
    </SceneFrame>
  );
}

// ─── Kapittel Søknad ─────────────────────────────────────

function SoknadAnalyzeScene() {
  const annonse = `Produktdesigner, Oslo
Vi ser etter en erfaren designer som kan lede discovery og levere helhetlige produktflyt. Søknadsfrist 14. mai.`;
  const typed = useTypewriter(annonse, 4, 20);
  const doneTyping = typed.length === annonse.length;
  const fields = [
    { label: "Selskap", value: "Nordisk Studio" },
    { label: "Stilling", value: "Produktdesigner" },
    { label: "Sted", value: "Oslo" },
    { label: "Frist", value: "14. mai 2026" },
  ];
  return (
    <SceneFrame>
      <SceneTitle>Lim inn stillingsannonse</SceneTitle>
      <motion.div
        animate={{ opacity: doneTyping ? 0.45 : 1, scale: doneTyping ? 0.98 : 1 }}
        transition={TRANSITION}
        className="rounded-xl border border-black/10 dark:border-white/10 bg-bg p-4 min-h-[110px] text-[13px] leading-[1.65] text-ink/85 whitespace-pre-line"
      >
        {typed}
        {!doneTyping && (
          <span className="inline-block w-px h-[1em] align-middle bg-accent ml-0.5 animate-pulse" />
        )}
      </motion.div>
      {doneTyping && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.1 + 0.12 * i }}
              className="rounded-xl border border-black/10 dark:border-white/10 bg-bg px-4 py-3"
            >
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-1">
                {f.label}
              </div>
              <div className="text-[14px] text-ink font-medium">{f.value}</div>
            </motion.div>
          ))}
        </div>
      )}
      {doneTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...TRANSITION, delay: 0.7 }}
          className="mt-4 flex items-center gap-2 text-[12px] text-ink-soft"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          AI har fylt inn feltene. Du kan redigere før du lagrer.
        </motion.div>
      )}
    </SceneFrame>
  );
}

function BrevScene() {
  // Avsnittslinjer «skrives» inn som voksende skeleton-linjer.
  const paragraphs = [
    [100, 94, 86],
    [97, 90, 72],
    [88, 60],
  ];
  return (
    <SceneFrame>
      <div className="flex items-center justify-between mb-4">
        <SceneTitle>Søknadsbrev</SceneTitle>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING}
          className="inline-flex items-center gap-1.5 bg-ink text-bg rounded-full px-3 py-1.5 text-[12px] font-medium"
        >
          <Sparkles className="w-3 h-3" /> Lag utkast
        </motion.div>
      </div>
      <div className="rounded-lg border border-black/10 bg-white shadow-sm p-5 md:p-7 max-w-[560px]">
        <div className="h-2 w-28 rounded-full bg-[#14110e] mb-1" />
        <div className="h-1 w-36 rounded-full bg-[#14110e]/30 mb-6" />
        <div className="h-1.5 w-44 rounded-full bg-[#14110e]/70 mb-4" />
        <div className="space-y-4">
          {paragraphs.map((lines, p) => (
            <div key={p} className="space-y-1.5">
              {lines.map((w, l) => (
                <motion.div
                  key={l}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.3 + p * 0.55 + l * 0.14,
                  }}
                  className="h-1 origin-left rounded-full bg-[#14110e]/15"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 2.2 }}
          className="mt-5 h-1 w-24 rounded-full bg-[#14110e]/40"
        />
      </div>
    </SceneFrame>
  );
}

function SoknadPipeline() {
  // Statusfarger fra src/lib/pipeline.ts.
  const cols = [
    { h: "Kladd", col: "#94a3b8", items: 2 },
    { h: "Sendt", col: "#D5592E", items: 4, incoming: true },
    { h: "Intervju", col: "#14110e", items: 2 },
    { h: "Tilbud", col: "#16a34a", items: 1 },
  ];
  const tasks = [
    { label: "Følg opp Nordisk Studio", due: "I dag" },
    { label: "Frist 14. mai", due: "Denne uken" },
  ];
  return (
    <SceneFrame>
      <SceneTitle>Pipeline</SceneTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cols.map((g) => (
          <div
            key={g.h}
            className="bg-bg rounded-xl p-3 border border-black/5 dark:border-white/5"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.col }} />
                <span className="text-[12px] font-medium">{g.h}</span>
              </div>
              <span className="text-[11px] text-ink-faint">{g.items}</span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: g.items }).map((_, j) => {
                const isIncoming = g.incoming && j === 0;
                if (isIncoming) {
                  // Stillingen fra Jobb-kapittelet lander i Sendt.
                  return (
                    <motion.div
                      key="incoming"
                      layoutId="job-card"
                      transition={SPRING}
                      className="p-2.5 rounded-lg bg-surface border border-accent/40"
                    >
                      <div className="text-[10.5px] font-medium text-ink truncate">
                        Produktdesigner
                      </div>
                      <div className="text-[9.5px] text-ink-muted truncate">
                        Nordisk Studio
                      </div>
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ ...TRANSITION, delay: 0.05 * j }}
                    className="p-2.5 rounded-lg bg-surface border border-black/5 dark:border-white/5"
                  >
                    <div className="h-1.5 w-16 rounded-full bg-ink/70 mb-1.5" />
                    <div className="h-1 w-10 rounded-full bg-ink/20" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tasks.map((t, i) => (
          <motion.span
            key={t.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.8 + 0.15 * i }}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-bg px-3 py-1.5 text-[11.5px] text-ink-soft"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
            {t.label}
            <span className="text-ink-faint">· {t.due}</span>
          </motion.span>
        ))}
      </div>
    </SceneFrame>
  );
}

// ─── Reduced motion: statisk 3-kolonners fallback ────────

function ProductDemoStatic() {
  return (
    <section
      aria-label="Produktdemo"
      className="max-w-[1200px] mx-auto px-5 md:px-10 pb-20 md:pb-32"
    >
      <div className="bg-panel rounded-[24px] md:rounded-[32px] p-5 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
        {CHAPTERS.map((ch) => (
          <StaticColumn
            key={ch.id}
            title={ch.title}
            items={STEPS.filter((s) => s.chapter === ch.id)}
          />
        ))}
      </div>
    </section>
  );
}

function StaticColumn({ title, items }: { title: string; items: Step[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-faint mb-4">
        {title}
      </div>
      <ol className="space-y-3">
        {items.map((s, i) => (
          <li
            key={s.label}
            className="bg-surface rounded-xl border border-black/5 dark:border-white/5 p-4 flex items-start gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-panel flex items-center justify-center shrink-0">
              <s.icon className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-ink">
                {i + 1}. {s.label}
              </div>
              <div className="text-[12px] text-ink-soft">{s.caption}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
