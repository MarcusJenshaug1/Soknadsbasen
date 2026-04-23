"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Role =
  | "design"
  | "utvikling"
  | "produkt"
  | "marked"
  | "annet";

type CvSource = "pdf" | "fra-bunn" | "linkedin";

const ROLES: { id: Role; label: string }[] = [
  { id: "design", label: "Design & UX" },
  { id: "utvikling", label: "Utvikling & teknologi" },
  { id: "produkt", label: "Produkt & ledelse" },
  { id: "marked", label: "Marked & kommunikasjon" },
  { id: "annet", label: "Noe annet" },
];

const CV_SOURCES: {
  id: CvSource;
  title: string;
  desc: string;
  recommended?: boolean;
}[] = [
  {
    id: "pdf",
    title: "Last opp PDF",
    desc: "Vi leser erfaring, utdanning og ferdigheter",
    recommended: true,
  },
  {
    id: "fra-bunn",
    title: "Start fra bunnen",
    desc: "Vi veileder deg gjennom hver seksjon",
  },
  {
    id: "linkedin",
    title: "Importer fra LinkedIn",
    desc: "Lim inn profil-URL",
  },
];

export default function VelkommenPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [source, setSource] = useState<CvSource>("pdf");

  function next() {
    setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s));
  }
  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s));
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#faf8f5] text-[#14110e]">
      <ProgressBar step={step} total={4} dark={step === 4} />
      <div className="flex-1 flex flex-col">
        {step === 1 && <Step1 onNext={next} />}
        {step === 2 && (
          <Step2
            role={role}
            setRole={setRole}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 3 && (
          <Step3
            source={source}
            setSource={setSource}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 4 && (
          <Step4 onFinish={() => router.replace("/app")} />
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  step,
  total,
  dark,
}: {
  step: number;
  total: number;
  dark: boolean;
}) {
  return (
    <div
      className={cn(
        "px-6 pt-6 pb-2",
        dark ? "bg-[#14110e]" : "bg-[#faf8f5]",
      )}
    >
      <div className="flex gap-1.5 max-w-xl mx-auto">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-0.5 flex-1 rounded-full",
              i < step
                ? dark
                  ? "bg-[#faf8f5]"
                  : "bg-[#14110e]"
                : dark
                  ? "bg-white/15"
                  : "bg-black/10",
            )}
          />
        ))}
      </div>
      <div
        className={cn(
          "text-[10px] uppercase tracking-[0.2em] mt-3 max-w-xl mx-auto",
          dark ? "text-white/50" : "text-[#14110e]/50",
        )}
      >
        Trinn {step} av {total}
      </div>
    </div>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex-1 flex flex-col justify-center px-6 max-w-xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 text-[11px] text-[#c15a3a] mb-5">
          <span className="w-1 h-1 rounded-full bg-[#c15a3a]" />
          Velkommen
        </div>
        <h1 className="text-[44px] md:text-[56px] leading-[1] tracking-[-0.035em] font-medium mb-5">
          La oss bygge basen din.
        </h1>
        <p className="text-[15px] md:text-[17px] leading-[1.6] text-[#14110e]/65">
          Tre korte spørsmål. Vi bruker svarene til å sette opp et godt
          startpunkt for deg.
        </p>
      </div>
      <div className="p-6 max-w-xl mx-auto w-full">
        <button
          onClick={onNext}
          className="w-full py-3.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[14px] font-medium hover:bg-[#c15a3a] transition-colors"
        >
          Start
        </button>
      </div>
    </>
  );
}

function Step2({
  role,
  setRole,
  onNext,
  onBack,
}: {
  role: Role | null;
  setRole: (r: Role) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pt-8 max-w-xl mx-auto w-full">
        <h1 className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.03em] font-medium mb-2">
          Hva slags jobb er du ute etter?
        </h1>
        <p className="text-[13px] md:text-[14px] text-[#14110e]/60 mb-7">
          Vi tilpasser eksempler og maler etter dette.
        </p>
        <div className="space-y-2">
          {ROLES.map((r) => {
            const selected = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl border bg-white text-left transition-colors",
                  selected
                    ? "border-[#14110e]"
                    : "border-black/8 hover:border-black/20",
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                    selected ? "border-[#14110e] bg-[#14110e]" : "border-black/25",
                  )}
                >
                  {selected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#faf8f5]" />
                  )}
                </span>
                <span className="text-[14px]">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6 max-w-xl mx-auto w-full flex gap-2">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-full border border-black/15 text-[13px] hover:border-black/30"
        >
          Tilbake
        </button>
        <button
          onClick={onNext}
          disabled={!role}
          className="flex-1 py-3 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a] transition-colors disabled:opacity-40"
        >
          Fortsett
        </button>
      </div>
    </>
  );
}

function Step3({
  source,
  setSource,
  onNext,
  onBack,
}: {
  source: CvSource;
  setSource: (s: CvSource) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pt-8 max-w-xl mx-auto w-full">
        <h1 className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.03em] font-medium mb-2">
          Har du allerede en CV?
        </h1>
        <p className="text-[13px] md:text-[14px] text-[#14110e]/60 mb-7">
          Vi henter det vi kan. Du fyller ut resten senere.
        </p>
        <div className="space-y-2">
          {CV_SOURCES.map((s) => {
            const selected = source === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSource(s.id)}
                className={cn(
                  "w-full p-5 rounded-2xl text-left transition-colors border-2",
                  selected
                    ? "border-[#c15a3a] bg-[#c15a3a]/5"
                    : "border-black/8 bg-white hover:border-black/20",
                )}
              >
                <div
                  className={cn(
                    "text-[16px] font-medium mb-0.5",
                    selected && "text-[#c15a3a]",
                  )}
                >
                  {s.title}
                </div>
                <div className="text-[12px] text-[#14110e]/65">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6 max-w-xl mx-auto w-full flex gap-2">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-full border border-black/15 text-[13px] hover:border-black/30"
        >
          Tilbake
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a] transition-colors"
        >
          Fortsett
        </button>
      </div>
    </>
  );
}

function Step4({ onFinish }: { onFinish: () => void }) {
  const matches = [
    { role: "Senior Produktdesigner", company: "Schibsted" },
    { role: "UX Lead", company: "Ruter" },
    { role: "Design Manager", company: "Vipps" },
  ];
  return (
    <div className="flex-1 flex flex-col bg-[#14110e] text-[#faf8f5]">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 text-[11px] text-[#c15a3a] mb-5">
          <span className="w-1 h-1 rounded-full bg-[#c15a3a]" />
          Klar
        </div>
        <h1 className="text-[44px] md:text-[56px] leading-[1] tracking-[-0.035em] font-medium mb-4">
          Basen din er
          <br />
          etablert.
        </h1>
        <p className="text-[15px] text-white/65 leading-relaxed mb-8">
          Vi har plukket ut tre stillinger som matcher profilen din.
        </p>
        <div className="space-y-2 mb-2">
          {matches.map((s, i) => (
            <div
              key={i}
              className="bg-white/8 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="text-[14px] font-medium">{s.role}</div>
                <div className="text-[12px] text-white/60">{s.company}</div>
              </div>
              <span className="text-[#c15a3a]">→</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 max-w-xl mx-auto w-full">
        <button
          onClick={onFinish}
          className="w-full py-3.5 rounded-full bg-[#faf8f5] text-[#14110e] text-[14px] font-medium hover:bg-white transition-colors"
        >
          Åpne basen min
        </button>
      </div>
    </div>
  );
}
