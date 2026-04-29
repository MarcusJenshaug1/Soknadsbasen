import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import { PricingCards } from "@/components/pricing/PricingCards";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  webApplicationJsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { HeaderCTA, PricingCTA } from "../LandingCTAs";

export const revalidate = 86400;

export const metadata = buildMetadata({
  path: "/priser",
  title: "Priser",
  description:
    "Søknadsbasen koster 79 kr per måned med 7 dagers gratis prøveperiode, eller 299 kr engangsbetaling for 6 måneders tilgang. Ingen skjulte kostnader.",
});

const PRICING_FAQ = [
  {
    q: "Hva koster Søknadsbasen?",
    a: "Søknadsbasen har to enkle planer: månedlig abonnement til 79 kr per måned med 7 dagers gratis prøveperiode, eller en engangsbetaling på 299 kr som gir 6 måneders tilgang uten automatisk fornyelse.",
  },
  {
    q: "Hvordan fungerer prøveperioden?",
    a: "Du får 7 dager gratis full tilgang når du starter månedsabonnementet. Kanselleres prøven før utløp belastes du ikke. Etter prøven trekkes 79 kr per måned automatisk.",
  },
  {
    q: "Kan jeg kansellere når som helst?",
    a: "Ja. Månedlig abonnement kan sies opp via billing-portalen og trer i kraft ved slutten av inneværende periode. Engangsbetaling fornyes ikke automatisk og krever ingen oppsigelse.",
  },
  {
    q: "Hva er forskjellen mellom månedlig og engangsbetaling?",
    a: "Månedlig (79 kr/mnd) er fleksibelt og kan stoppes når du vil. Engangsbetaling (299 kr) gir 6 måneder tilgang uten fornyelse, til en lavere månedspris (cirka 50 kr/mnd) hvis du vet du trenger verktøyet en stund.",
  },
  {
    q: "Får jeg tilgang til alle funksjoner i begge planer?",
    a: "Ja. Begge planer gir full tilgang til CV-bygger, søknadsbrev, pipeline, oppgaver, innsikt og ATS-eksport. Det er ingen funksjonsbegrensninger basert på plan.",
  },
  {
    q: "Beholder jeg CV-ene mine etter at abonnementet utløper?",
    a: "CV-er kan eksporteres til PDF når som helst og er dine å beholde. Etter utløpt abonnement stenges aktiv redigering, men eksporterte filer forblir dine for alltid.",
  },
  {
    q: "Tilbyr dere studentrabatt eller bedriftslisens?",
    a: "Ikke per i dag. Søknadsbasen er bygget for enkeltpersoner, og prisen er allerede satt lavt slik at den skal være tilgjengelig for alle.",
  },
  {
    q: "Hvilke betalingsmåter aksepterer dere?",
    a: "Vi bruker Stripe og aksepterer Visa, Mastercard og American Express. Faktura tilbys ikke for privatpersoner.",
  },
];

const BREADCRUMBS = [
  { name: "Søknadsbasen", path: "/" },
  { name: "Priser", path: "/priser" },
];

export default function PriserPage() {
  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY!;
  const oneTimePriceId = process.env.STRIPE_PRICE_ONETIME!;

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript
        data={[
          webApplicationJsonLd(),
          breadcrumbJsonLd(BREADCRUMBS),
          faqJsonLd(PRICING_FAQ.map(({ q, a }) => ({ q, a }))),
        ]}
      />

      <header className="max-w-[1200px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <nav
          aria-label="Hovedmeny"
          className="hidden md:flex items-center gap-9 text-[13px] text-[#14110e]/70"
        >
          <Link href="/#produkt" className="hover:text-[#14110e]">
            Produkt
          </Link>
          <Link href="/funksjoner" className="hover:text-[#14110e]">
            Funksjoner
          </Link>
          <Link href="/priser" className="text-[#14110e]">
            Priser
          </Link>
          <Link href="/guide" className="hover:text-[#14110e]">
            Guide
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <HeaderCTA />
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs items={BREADCRUMBS} />
        </div>

        <section
          aria-labelledby="priser-heading"
          className="pt-6 md:pt-10 pb-16 md:pb-20 text-center"
        >
          <SectionLabel tone="accent" className="mb-4">
            Priser
          </SectionLabel>
          <h1
            id="priser-heading"
            className="text-[44px] md:text-[72px] leading-[1] tracking-[-0.035em] font-medium mb-6"
          >
            Priser for Søknadsbasen
          </h1>
          <p className="max-w-[640px] mx-auto text-[16px] md:text-[18px] leading-[1.6] text-[#14110e]/70">
            To enkle valg, ingen skjulte kostnader. Prøv månedsabonnementet
            gratis i syv dager, eller betal én gang for seks måneder uten
            automatisk fornyelse. Begge planer gir full tilgang til alle
            funksjoner.
          </p>
        </section>

        <section
          aria-label="Prisalternativer"
          className="pb-20 md:pb-24"
        >
          <PricingCards
            monthlyCta={
              <PricingCTA
                priceId={monthlyPriceId}
                mode="subscription"
                label="Prøv gratis i 7 dager"
              />
            }
            oneTimeCta={
              <PricingCTA
                priceId={oneTimePriceId}
                mode="payment"
                label="Kjøp 6 måneder"
                variant="inverse"
              />
            }
          />
        </section>

        <section
          aria-labelledby="hva-far-du-heading"
          className="pb-20 md:pb-24 grid grid-cols-12 gap-6 md:gap-8"
        >
          <div className="col-span-12 md:col-span-5">
            <SectionLabel tone="accent" className="mb-4">
              Hva er inkludert
            </SectionLabel>
            <h2
              id="hva-far-du-heading"
              className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.025em] font-medium"
            >
              Full tilgang i begge planer.
            </h2>
          </div>
          <ul className="col-span-12 md:col-span-7 space-y-4 text-[15px] leading-[1.6] text-[#14110e]/80">
            <li>
              <strong className="text-[#14110e]">CV-bygger</strong> med åtte
              maler, seks fargepaletter og ubegrenset PDF-eksport optimalisert
              for ATS-systemer.
            </li>
            <li>
              <strong className="text-[#14110e]">AI-assistert søknadsbrev</strong>{" "}
              som skrives i konteksten av stillingen, med automatisk
              versjonshåndtering.
            </li>
            <li>
              <strong className="text-[#14110e]">Pipeline og oppgaver</strong>{" "}
              med kanban-visning, listevisning og frister for hver søknad.
            </li>
            <li>
              <strong className="text-[#14110e]">Innsikt og rapporter</strong>{" "}
              som viser hvor intervjuer faktisk kommer fra og hva som virker.
            </li>
            <li>
              <strong className="text-[#14110e]">Datasikkerhet i EU</strong>:
              alle data lagres hos Supabase i Stockholm. Ingen datasalg, ingen
              tredjeparts-markedsføring.
            </li>
          </ul>
        </section>

        <section
          id="faq"
          aria-labelledby="priser-faq-heading"
          className="pb-20 md:pb-24"
        >
          <div className="mb-10 text-center">
            <SectionLabel tone="accent" className="mb-3">
              Spørsmål om priser
            </SectionLabel>
            <h2
              id="priser-faq-heading"
              className="text-[32px] md:text-[48px] tracking-[-0.03em] font-medium leading-[1.05]"
            >
              Ofte stilte spørsmål
            </h2>
          </div>
          <dl className="divide-y divide-black/10 border-t border-b border-black/10">
            {PRICING_FAQ.map(({ q, a }) => (
              <div key={q} className="py-6 md:py-7">
                <dt className="text-[17px] md:text-[19px] font-medium tracking-tight mb-2">
                  {q}
                </dt>
                <dd className="text-[14px] md:text-[15px] leading-[1.7] text-[#14110e]/75">
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-label="Les mer"
          className="pb-12 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Link
            href="/funksjoner"
            className="border border-black/10 rounded-2xl p-6 hover:border-ink/30 transition-colors"
          >
            <div className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/50 mb-2">
              Mer om produktet
            </div>
            <div className="text-[18px] font-medium mb-1">
              Funksjoner i Søknadsbasen
            </div>
            <p className="text-[13px] text-[#14110e]/65">
              Detaljert oversikt over CV-bygger, søknadsbrev og pipeline.
            </p>
          </Link>
          <Link
            href="/guide"
            className="border border-black/10 rounded-2xl p-6 hover:border-ink/30 transition-colors"
          >
            <div className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/50 mb-2">
              Guide
            </div>
            <div className="text-[18px] font-medium mb-1">
              Jobbsøking, forklart
            </div>
            <p className="text-[13px] text-[#14110e]/65">
              Praktiske guider om CV, søknadsbrev, intervju og lønn.
            </p>
          </Link>
        </section>
      </main>

      <footer className="border-t border-black/10">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 flex flex-wrap items-center justify-between text-[12px] text-[#14110e]/55 gap-4">
          <span>© 2026 Søknadsbasen</span>
          <a
            href="https://marcusjenshaug.no"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#14110e]"
          >
            laget av Marcus Jenshaug
          </a>
          <span className="flex items-center gap-3">
            <Link href="/om" className="hover:text-[#14110e]">
              Om
            </Link>
            <span className="text-[#14110e]/25">·</span>
            <Link href="/guide" className="hover:text-[#14110e]">
              Guide
            </Link>
            <span className="text-[#14110e]/25">·</span>
            <Link href="/personvern" className="hover:text-[#14110e]">
              Personvern
            </Link>
            <span className="text-[#14110e]/25">·</span>
            <Link href="/vilkar" className="hover:text-[#14110e]">
              Vilkår
            </Link>
            <span className="text-[#14110e]/25">·</span>
            <a href="mailto:marcus@jenshaug.no" className="hover:text-[#14110e]">
              Kontakt
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
