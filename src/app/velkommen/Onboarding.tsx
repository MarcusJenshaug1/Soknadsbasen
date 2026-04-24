"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Role = "design" | "utvikling" | "produkt" | "marked" | "helse" | "okonomi" | "salg" | "undervisning";

type CvSource = "pdf" | "fra-bunn" | "linkedin";

const ROLES: { id: Role; label: string }[] = [
  { id: "design", label: "Design & UX" },
  { id: "utvikling", label: "Utvikling & teknologi" },
  { id: "produkt", label: "Produkt & ledelse" },
  { id: "marked", label: "Marked & kommunikasjon" },
  { id: "salg", label: "Salg & kundebehandling" },
  { id: "okonomi", label: "Økonomi & administrasjon" },
  { id: "helse", label: "Helse & omsorg" },
  { id: "undervisning", label: "Undervisning & pedagogikk" },
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

type Step = 1 | 2 | 3 | 4 | 5;

type Props = {
  monthlyPriceId: string;
  oneTimePriceId: string;
};

export function Onboarding({ monthlyPriceId, oneTimePriceId }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [source, setSource] = useState<CvSource>("pdf");

  function next() {
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  }
  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#faf8f5] text-[#14110e]">
      <ProgressBar step={step} total={5} dark={step === 4} />
      <div className="flex-1 flex flex-col">
        {step === 1 && <Step1 onNext={next} />}
        {step === 2 && (
          <Step2
            role={role}
            setRole={setRole}
            customRole={customRole}
            setCustomRole={setCustomRole}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 3 && (
          <Step3 source={source} setSource={setSource} onNext={next} onBack={back} />
        )}
        {step === 4 && <Step4 onNext={next} onBack={back} />}
        {step === 5 && (
          <Step5
            monthlyPriceId={monthlyPriceId}
            oneTimePriceId={oneTimePriceId}
            onBack={back}
          />
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
        <div className="inline-flex items-center gap-2 text-[11px] text-[#D5592E] mb-5">
          <span className="w-1 h-1 rounded-full bg-[#D5592E]" />
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
          className="w-full py-3.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium hover:bg-[#a94424] transition-colors"
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
  customRole,
  setCustomRole,
  onNext,
  onBack,
}: {
  role: Role | null;
  setRole: (r: Role | null) => void;
  customRole: string;
  setCustomRole: (s: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = role !== null || customRole.trim().length > 0;
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pt-8 max-w-xl mx-auto w-full">
        <h1 className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.03em] font-medium mb-2">
          Hva slags jobb er du ute etter?
        </h1>
        <p className="text-[13px] md:text-[14px] text-[#14110e]/60 mb-7">
          Velg et felt — eller skriv ditt eget.
        </p>
        <div className="space-y-2">
          {ROLES.map((r) => {
            const selected = role === r.id && customRole.trim().length === 0;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setCustomRole("");
                }}
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

        <div className="mt-6">
          <label className="block text-[12px] uppercase tracking-[0.15em] text-[#14110e]/55 mb-2">
            Eller skriv ditt eget
          </label>
          <input
            type="text"
            value={customRole}
            onChange={(e) => {
              setCustomRole(e.target.value);
              if (e.target.value.trim().length > 0) setRole(null);
            }}
            placeholder="f.eks. Sykepleier, Prosjektleder, Jurist…"
            className={cn(
              "w-full px-4 py-3 rounded-2xl border bg-white text-[14px] outline-none transition-colors",
              customRole.trim().length > 0
                ? "border-[#14110e]"
                : "border-black/8 focus:border-black/30",
            )}
          />
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
          disabled={!canContinue}
          className="flex-1 py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] transition-colors disabled:opacity-40"
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
                    ? "border-[#D5592E] bg-[#D5592E]/5"
                    : "border-black/8 bg-white hover:border-black/20",
                )}
              >
                <div
                  className={cn(
                    "text-[16px] font-medium mb-0.5",
                    selected && "text-[#D5592E]",
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
          className="flex-1 py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] transition-colors"
        >
          Fortsett
        </button>
      </div>
    </>
  );
}

function Step4({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const matches = [
    { role: "Senior Produktdesigner", company: "Schibsted" },
    { role: "UX Lead", company: "Ruter" },
    { role: "Design Manager", company: "Vipps" },
  ];
  return (
    <div className="flex-1 flex flex-col bg-[#14110e] text-[#faf8f5]">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 text-[11px] text-[#D5592E] mb-5">
          <span className="w-1 h-1 rounded-full bg-[#D5592E]" />
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
              <span className="text-[#D5592E]">→</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 max-w-xl mx-auto w-full flex gap-2">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-full border border-white/20 text-[13px] text-[#faf8f5]/80 hover:border-white/40 hover:text-[#faf8f5]"
        >
          Tilbake
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-full bg-[#faf8f5] text-[#14110e] text-[14px] font-medium hover:bg-white transition-colors"
        >
          Fortsett
        </button>
      </div>
    </div>
  );
}

function Step5({
  monthlyPriceId,
  oneTimePriceId,
  onBack,
}: {
  monthlyPriceId: string;
  oneTimePriceId: string;
  onBack: () => void;
}) {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(priceId: string, mode: "subscription" | "payment") {
    setLoadingPriceId(priceId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
      });
      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({ error: "" }))) as {
          error?: string;
        };
        throw new Error(msg || "Kunne ikke starte betaling");
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setLoadingPriceId(null);
    }
  }

  const monthlyFeatures = [
    "Ubegrenset tilgang til CV-editor og maler",
    "Eksport til PDF",
    "Jobbsøknads-pipeline med oppgaver",
    "Avslutt når du vil",
  ];
  const oneTimeFeatures = [
    "6 måneders full tilgang",
    "Alt i månedlig plan",
    "Ingen automatisk fornyelse",
  ];

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pt-8 max-w-3xl mx-auto w-full">
        <h1 className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.03em] font-medium mb-2">
          Velg plan for å komme i gang
        </h1>
        <p className="text-[13px] md:text-[14px] text-[#14110e]/60 mb-8">
          7 dager gratis prøveperiode på månedlig. Kanseller når du vil.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div className="rounded-3xl bg-white border border-black/5 p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-[18px] font-semibold text-[#14110e]">Månedlig</h3>
              <p className="mt-1 text-[12px] text-black/55">
                7 dager gratis, deretter 79 kr/mnd
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">79 kr</span>
                <span className="text-[12px] text-black/55">/mnd</span>
              </div>
            </div>
            <ul className="mb-6 space-y-2 flex-1">
              <li className="flex items-start gap-2 text-[12px] font-medium text-[#D5592E]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>7 dager gratis — kanseller før belastning</span>
              </li>
              {monthlyFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12px]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D5592E]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout(monthlyPriceId, "subscription")}
              disabled={loadingPriceId !== null}
              className="w-full py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] transition-colors disabled:opacity-50"
            >
              {loadingPriceId === monthlyPriceId
                ? "Sender deg til Stripe…"
                : "Prøv gratis i 7 dager"}
            </button>
          </div>

          <div className="rounded-3xl bg-[#14110e] text-[#faf8f5] p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-[18px] font-semibold">Engangsbetaling</h3>
              <p className="mt-1 text-[12px] text-white/60">6 måneders tilgang</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">299 kr</span>
                <span className="text-[12px] text-white/60">/ 6 mnd</span>
              </div>
            </div>
            <ul className="mb-6 space-y-2 flex-1">
              {oneTimeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12px]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D5592E]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout(oneTimePriceId, "payment")}
              disabled={loadingPriceId !== null}
              className="w-full py-3 rounded-full bg-[#faf8f5] text-[#14110e] text-[13px] font-medium hover:bg-white transition-colors disabled:opacity-50"
            >
              {loadingPriceId === oneTimePriceId
                ? "Sender deg til Stripe…"
                : "Kjøp 6 måneder"}
            </button>
          </div>
        </div>
        {error && <p className="text-[12px] text-[#D5592E] text-center">{error}</p>}
        <p className="mt-6 text-center text-[11px] text-[#14110e]/55">
          Ved å starte bekrefter du at{" "}
          <a href="/vilkar" className="underline underline-offset-2 hover:text-[#14110e]">
            vilkårene
          </a>{" "}
          og{" "}
          <a href="/personvern" className="underline underline-offset-2 hover:text-[#14110e]">
            personvernerklæringen
          </a>{" "}
          gjelder. Du samtykker til at leveringen starter umiddelbart og at
          angreretten dermed faller bort (jf. angrerettsloven § 22 n).
        </p>
      </div>
      <div className="p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          disabled={loadingPriceId !== null}
          className="px-5 py-3 rounded-full border border-black/15 text-[13px] hover:border-black/30 disabled:opacity-50"
        >
          Tilbake
        </button>
      </div>
    </>
  );
}
