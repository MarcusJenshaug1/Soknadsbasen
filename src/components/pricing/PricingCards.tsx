import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Props = {
  monthlyCta: React.ReactNode;
  oneTimeCta: React.ReactNode;
};

// SEO-KONTRAKT: monthlyFeatures/oneTimeFeatures må synkroniseres med
// competitors.ts (comparisonTable), funksjoner/page.tsx (FEATURES),
// jsonld.ts (webApplicationJsonLd.featureList), og siteConfig.pricing.
// Se AGENTS.md "Sammenligning- og pris-sider er kontrakter".
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
  "Én betaling — ferdig",
];

export function PricingCards({ monthlyCta, oneTimeCta }: Props) {
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
      <Card variant="surface" radius="3xl" className="p-8">
        <div className="mb-6">
          <h3 className="text-[20px] font-semibold text-ink">Månedlig</h3>
          <p className="mt-1 text-[13px] text-black/55">
            Prøv gratis i 7 dager, deretter 79 kr/mnd
          </p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-semibold text-ink">79 kr</span>
            <span className="text-[13px] text-black/55 dark:text-white/55">/mnd</span>
          </div>
        </div>
        <ul className="mb-8 space-y-3">
          <li className="flex items-start gap-2 text-[13px] font-medium text-accent">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>7 dager gratis — kanseller før belastning</span>
          </li>
          {monthlyFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-ink">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {monthlyCta}
      </Card>

      <Card variant="ink" radius="3xl" className="p-8">
        <div className="mb-6">
          <h3 className="text-[20px] font-semibold">Engangsbetaling</h3>
          <p className="mt-1 text-[13px] text-white/60">6 måneders tilgang</p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-semibold">299 kr</span>
            <span className="text-[13px] text-white/60">/ 6 mnd</span>
          </div>
        </div>
        <ul className="mb-8 space-y-3">
          {oneTimeFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {oneTimeCta}
      </Card>
      </div>
      <p className="mt-6 text-center text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
        Ved å starte bekrefter du at{" "}
        <Link href="/vilkar" className="underline underline-offset-2 hover:text-ink">
          vilkårene
        </Link>{" "}
        og{" "}
        <Link href="/personvern" className="underline underline-offset-2 hover:text-ink">
          personvernerklæringen
        </Link>{" "}
        gjelder. Du samtykker til at leveringen starter umiddelbart og at
        angreretten dermed faller bort (jf. angrerettsloven § 22 n).
      </p>
    </div>
  );
}
