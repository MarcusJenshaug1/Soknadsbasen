"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  FileText,
  Sparkles,
  Eye,
  ClipboardPaste,
  Wand2,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Track = "cv" | "soknad";
type Step = {
  track: Track;
  label: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number;
};

const STEPS: Step[] = [
  { track: "cv", label: "Velg mal", caption: "Åtte rolige maler. Én blir din.", icon: FileText, duration: 2200 },
  { track: "cv", label: "AI foreslår profiltekst", caption: "Du velger tone. AI foreslår. Du redigerer.", icon: Sparkles, duration: 3400 },
  { track: "cv", label: "Forhåndsvisning oppdateres", caption: "Preview følger med, i sanntid.", icon: Eye, duration: 2400 },
  { track: "soknad", label: "Lim inn stillingsannonse", caption: "Lim inn. Ingen skjema å fylle ut.", icon: ClipboardPaste, duration: 2400 },
  { track: "soknad", label: "AI fyller feltene", caption: "Firma, tittel, frist — hentet ut.", icon: Wand2, duration: 2800 },
  { track: "soknad", label: "Inn i pipelinen", caption: "Kladd. Sendt. Intervju. Tilbud.", icon: LayoutGrid, duration: 2800 },
];

const TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

export default function ProductDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (reduce || !inView || paused) return;
    const t = setTimeout(
      () => setIndex((i) => (i + 1) % STEPS.length),
      STEPS[index].duration,
    );
    return () => clearTimeout(t);
  }, [index, inView, paused, reduce]);

  if (reduce) return <ProductDemoStatic />;

  const step = STEPS[index];
  const trackIndex = STEPS.filter((s) => s.track === step.track).findIndex(
    (s) => s === step,
  );
  const trackSteps = STEPS.filter((s) => s.track === step.track);

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
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/45 dark:text-[#f0ece6]/45">
              {step.track === "cv" ? "CV" : "Søknad"}
            </span>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Demo-steg">
              {trackSteps.map((s, i) => {
                const absoluteIdx = STEPS.indexOf(s);
                const active = i === trackIndex;
                return (
                  <button
                    key={s.label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Gå til steg ${i + 1}: ${s.label}`}
                    onClick={() => setIndex(absoluteIdx)}
                    className={cn(
                      "h-1 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#D5592E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eee9df]",
                      active ? "w-8 bg-ink" : "w-4 bg-[#14110e]/20 dark:bg-[#f0ece6]/20 hover:bg-[#14110e]/40 dark:hover:bg-[#f0ece6]/40",
                    )}
                  />
                );
              })}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/45 dark:text-[#f0ece6]/45 hidden md:block">
            Live demo
          </span>
        </div>

        <div className="relative min-h-[420px] md:min-h-[480px]">
          <AnimatePresence mode="wait">
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
              <div className="text-[12px] md:text-[13px] text-[#14110e]/60 dark:text-[#f0ece6]/60">
                {step.caption}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ol className="sr-only">
        {STEPS.map((s) => (
          <li key={s.label}>
            {s.track === "cv" ? "CV" : "Søknad"}: {s.label}. {s.caption}
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepScene({ index }: { index: number }) {
  switch (index) {
    case 0: return <CvTemplates />;
    case 1: return <CvAiProfile />;
    case 2: return <CvPreview />;
    case 3: return <SoknadPaste />;
    case 4: return <SoknadExtract />;
    case 5: return <SoknadPipeline />;
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

function CvTemplates() {
  const templates = ["Klassisk", "Moderne", "Minimal", "Strukturert"];
  const selected = 1;
  return (
    <SceneFrame>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-5">
        Velg mal
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {templates.map((t, i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...TRANSITION, delay: 0.08 * i }}
            className={cn(
              "relative aspect-[3/4] rounded-xl border bg-bg p-3 flex flex-col gap-1.5",
              i === selected ? "border-accent ring-2 ring-accent/20" : "border-black/10 dark:border-white/10",
            )}
          >
            <div className="h-1.5 w-12 rounded-full bg-[#14110e]/70" />
            <div className="h-1 w-8 rounded-full bg-[#14110e]/20 mb-2" />
            <div className="h-0.5 w-full rounded-full bg-[#14110e]/10" />
            <div className="h-0.5 w-4/5 rounded-full bg-[#14110e]/10" />
            <div className="h-0.5 w-3/5 rounded-full bg-[#14110e]/10" />
            <div className="mt-auto text-[10px] text-[#14110e]/55 dark:text-[#f0ece6]/55">{t}</div>
          </motion.div>
        ))}
      </div>
    </SceneFrame>
  );
}

function CvAiProfile() {
  const tones = ["Varm", "Formell", "Konsis"];
  const selectedTone = 0;
  const fullText =
    "Produktdesigner med syv års erfaring fra nordiske SaaS-selskaper. Trygg i grenselandet mellom research, interaksjon og systemtenkning.";
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => {
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      if (i >= fullText.length) {
        setTyped(fullText);
        clearInterval(id);
      } else {
        setTyped(fullText.slice(0, i));
      }
    }, 28);
    return () => clearInterval(id);
  }, []);
  return (
    <SceneFrame>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-4">
        Profiltekst
      </div>
      <div className="flex items-center gap-2 mb-4 bg-panel rounded-full p-1 w-fit">
        {tones.map((tone, i) => (
          <div
            key={tone}
            className={cn(
              "px-3 py-1 rounded-full text-[12px]",
              i === selectedTone ? "bg-surface text-ink font-medium" : "text-[#14110e]/60 dark:text-[#f0ece6]/60",
            )}
          >
            {tone}
          </div>
        ))}
        <div className="ml-1 inline-flex items-center gap-1.5 bg-ink text-bg rounded-full px-3 py-1 text-[12px]">
          <Sparkles className="w-3 h-3" /> Generer
        </div>
      </div>
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-bg p-4 min-h-[140px] text-[13px] leading-[1.6] text-[#14110e]/85 dark:text-[#f0ece6]/85">
        {typed}
        <span className="inline-block w-px h-[1em] align-middle bg-accent ml-0.5 animate-pulse" />
      </div>
    </SceneFrame>
  );
}

function CvPreview() {
  return (
    <SceneFrame>
      <div className="grid grid-cols-5 gap-6 h-full">
        <div className="col-span-2 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-3">
            Redigerer
          </div>
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-bg p-3">
            <div className="h-1.5 w-16 rounded-full bg-[#14110e]/70 mb-2" />
            <div className="space-y-1">
              <div className="h-1 w-full rounded-full bg-[#14110e]/15" />
              <div className="h-1 w-5/6 rounded-full bg-[#14110e]/15" />
              <div className="h-1 w-2/3 rounded-full bg-[#14110e]/15" />
            </div>
          </div>
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-bg p-3">
            <div className="h-1.5 w-20 rounded-full bg-[#14110e]/70 mb-2" />
            <div className="space-y-1">
              <div className="h-1 w-3/4 rounded-full bg-[#14110e]/15" />
              <div className="h-1 w-1/2 rounded-full bg-[#14110e]/15" />
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={TRANSITION}
          className="col-span-3 rounded-lg border border-black/10 bg-white shadow-sm p-4 md:p-6"
        >
          <div className="h-2 w-32 rounded-full bg-[#14110e] mb-1" />
          <div className="h-1.5 w-24 rounded-full bg-[#D5592E] mb-5" />
          <div className="space-y-1.5 mb-4">
            <div className="h-1 w-full rounded-full bg-[#14110e]/15" />
            <div className="h-1 w-11/12 rounded-full bg-[#14110e]/15" />
            <div className="h-1 w-4/5 rounded-full bg-[#14110e]/15" />
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

function SoknadPaste() {
  const full = `Produktdesigner – Oslo
Vi ser etter en erfaren designer som kan lede discovery og levere helhetlige produktflyt. Søknadsfrist 14. mai.`;
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => {
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      if (i >= full.length) {
        setTyped(full);
        clearInterval(id);
      } else {
        setTyped(full.slice(0, i));
      }
    }, 22);
    return () => clearInterval(id);
  }, []);
  return (
    <SceneFrame>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-4">
        Lim inn stillingsannonse
      </div>
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-bg p-4 min-h-[260px] text-[13px] leading-[1.65] text-[#14110e]/85 dark:text-[#f0ece6]/85 whitespace-pre-line">
        {typed}
        <span className="inline-block w-px h-[1em] align-middle bg-accent ml-0.5 animate-pulse" />
      </div>
      <div className="mt-4 flex items-center justify-end">
        <div className="inline-flex items-center gap-1.5 bg-ink text-bg rounded-full px-4 py-2 text-[12px] font-medium">
          <Wand2 className="w-3 h-3" /> Les stilling
        </div>
      </div>
    </SceneFrame>
  );
}

function SoknadExtract() {
  const fields = [
    { label: "Selskap", value: "Nordisk Studio" },
    { label: "Stilling", value: "Produktdesigner" },
    { label: "Sted", value: "Oslo" },
    { label: "Frist", value: "14. mai 2026" },
  ];
  return (
    <SceneFrame>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-4">
        Hentet fra annonsen
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...TRANSITION, delay: 0.15 + 0.18 * i }}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-bg px-4 py-3"
          >
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-1">
              {f.label}
            </div>
            <div className="text-[14px] text-ink font-medium">{f.value}</div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...TRANSITION, delay: 1.0 }}
        className="mt-5 flex items-center gap-2 text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        AI har fylt inn feltene. Du kan redigere før du lagrer.
      </motion.div>
    </SceneFrame>
  );
}

function SoknadPipeline() {
  const cols = [
    { h: "Kladd", col: "#94a3b8", items: 2 },
    { h: "Sendt", col: "#D5592E", items: 4, incoming: true },
    { h: "Intervju", col: "#14110e", items: 2 },
    { h: "Tilbud", col: "#16a34a", items: 1 },
  ];
  return (
    <SceneFrame>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-4">
        Pipeline
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cols.map((g) => (
          <div key={g.h} className="bg-bg rounded-xl p-3 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.col }} />
                <span className="text-[12px] font-medium">{g.h}</span>
              </div>
              <span className="text-[11px] text-[#14110e]/40 dark:text-[#f0ece6]/40">{g.items}</span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: g.items }).map((_, j) => {
                const isIncoming = g.incoming && j === 0;
                return (
                  <motion.div
                    key={j}
                    initial={isIncoming ? { opacity: 0, y: -12 } : { opacity: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      ...TRANSITION,
                      delay: isIncoming ? 0.6 : 0.05 * j,
                    }}
                    className="p-2.5 rounded-lg bg-surface border border-black/5 dark:border-white/5"
                  >
                    <div className="h-1.5 w-16 rounded-full bg-[#14110e]/70 mb-1.5" />
                    <div className="h-1 w-10 rounded-full bg-[#14110e]/20" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SceneFrame>
  );
}

function ProductDemoStatic() {
  const cv = STEPS.filter((s) => s.track === "cv");
  const soknad = STEPS.filter((s) => s.track === "soknad");
  return (
    <section
      aria-label="Produktdemo"
      className="max-w-[1200px] mx-auto px-5 md:px-10 pb-20 md:pb-32"
    >
      <div className="bg-panel rounded-[24px] md:rounded-[32px] p-5 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
        <StaticColumn title="CV" items={cv} />
        <StaticColumn title="Søknad" items={soknad} />
      </div>
    </section>
  );
}

function StaticColumn({ title, items }: { title: string; items: Step[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/45 dark:text-[#f0ece6]/45 mb-4">
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
              <div className="text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60">{s.caption}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
