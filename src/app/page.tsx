import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import { PricingCards } from "@/components/pricing/PricingCards";
import ProductDemo from "@/components/landing/ProductDemoLazy";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { faqJsonLd, webApplicationJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  HeaderCTA,
  HeroCTA,
  ClosingCTA,
  PricingCTA,
} from "./LandingCTAs";

export const metadata = buildMetadata({ path: "/" });

const FAQ = [
  {
    q: "Hva er Søknadsbasen?",
    a: "Et arbeidsrom for jobbsøkeren: CV, søknadsbrev, pipeline, oppfølging og innsikt samlet ett sted. Bygget for å gi ro, ikke flere distraksjoner.",
  },
  {
    q: "Hvem står bak?",
    a: "Marcus Jenshaug driver Søknadsbasen som privatperson i Norge. Ingen investorer, ingen datainnsamling for markedsføring.",
  },
  {
    q: "Hva koster det?",
    a: "79 kr per måned med 7 dagers gratis prøveperiode, eller 299 kr for 6 måneders tilgang som engangsbetaling. Engangsvarianten fornyes ikke automatisk.",
  },
  {
    q: "Eier jeg CV-ene mine?",
    a: "Ja. Du eier alt innhold du legger inn. CV-er kan eksporteres til PDF når du vil, og forblir dine også etter at abonnementet tar slutt.",
  },
  {
    q: "Er CV-ene ATS-vennlige?",
    a: "Ja. PDF-eksport er optimalisert for rekrutteringssystemer (ATS) slik at maskinell lesing ikke feiler på struktur eller layout.",
  },
  {
    q: "Hvor lagres dataene mine?",
    a: "I EU. Supabase (Stockholm) for database og autentisering, Vercel for hosting. Vi selger aldri data og bruker dem ikke til tredjeparts-markedsføring.",
  },
  {
    q: "Kan jeg kansellere når som helst?",
    a: "Ja. Månedlig abonnement kan sies opp via billing-portalen og trer i kraft ved slutten av inneværende betalingsperiode. Prøveperioden kan kanselleres uten belastning.",
  },
  {
    q: "Hvorfor «jobbsøking, med ro»?",
    a: "Fordi flere søknader sjelden er svaret. Søknadsbasen hjelper deg se hvor du er, hva som mangler og hva neste time fortjener, i stedet for å dytte deg mot å søke mer.",
  },
];

export default function Home() {
  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY!;
  const oneTimePriceId = process.env.STRIPE_PRICE_ONETIME!;

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript
        data={[
          webApplicationJsonLd(),
          faqJsonLd(FAQ.map(({ q, a }) => ({ q, a }))),
        ]}
      />

      <header className="max-w-[1200px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <nav
          aria-label="Hovedmeny"
          className="hidden md:flex items-center gap-9 text-[13px] text-[#14110e]/70"
        >
          <Link href="#produkt" className="hover:text-[#14110e]">
            Produkt
          </Link>
          <Link href="/funksjoner" className="hover:text-[#14110e]">
            Funksjoner
          </Link>
          <Link href="/priser" className="hover:text-[#14110e]">
            Priser
          </Link>
          <Link href="/guide" className="hover:text-[#14110e]">
            Guide
          </Link>
          <Link href="#faq" className="hover:text-[#14110e]">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <HeaderCTA />
        </div>
      </header>

      <main>
        <section
          aria-labelledby="hero-heading"
          className="max-w-[1100px] mx-auto px-5 md:px-10 pt-16 md:pt-24 pb-20 md:pb-32 text-center"
        >
          <div className="inline-flex items-center gap-2 text-[11px] text-[#14110e]/55 mb-10">
            <span className="w-1 h-1 rounded-full bg-[#D5592E]" />
            Ny utgave 2026
            <span className="w-1 h-1 rounded-full bg-[#D5592E]" />
          </div>
          <h1
            id="hero-heading"
            className="text-[56px] sm:text-[72px] md:text-[120px] leading-[0.95] font-medium tracking-[-0.045em] mb-8 md:mb-10"
          >
            Jobbsøking,
            <br />
            med ro.
          </h1>
          <p className="text-[16px] md:text-[19px] leading-[1.6] max-w-[560px] mx-auto text-[#14110e]/65 mb-10 md:mb-12">
            Søknadsbasen samler CV-er, brev og oppfølging i ett tydelig arbeidsrom.
            Bygget for å bli mindre stresset, ikke mer distrahert.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <HeroCTA />
            <Link
              href="#produkt"
              className="px-6 py-3.5 rounded-full text-[14px] text-[#14110e]/70 hover:text-[#14110e] hover:bg-black/5 transition-colors inline-flex items-center gap-1.5"
            >
              Se demo <span className="text-[#D5592E]">→</span>
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="hva-er-heading"
          className="max-w-[820px] mx-auto px-5 md:px-10 pb-20 md:pb-28"
        >
          <SectionLabel tone="accent" className="mb-3">
            Om Søknadsbasen
          </SectionLabel>
          <h2
            id="hva-er-heading"
            className="text-[28px] md:text-[40px] leading-[1.1] tracking-[-0.025em] font-medium mb-6"
          >
            Hva er Søknadsbasen?
          </h2>
          <div className="space-y-4 text-[15px] md:text-[16px] leading-[1.7] text-[#14110e]/80">
            <p>
              Søknadsbasen er en norsk jobbsøker-plattform for deg som vil ha
              orden på CV, søknadsbrev og jobbsøkingen din i ett tydelig
              arbeidsrom. Verktøyet kombinerer en CV-bygger med åtte maler,
              AI-assistert søknadsbrev og en pipeline for å holde styr på alle
              stillingene du vurderer eller har søkt på.
            </p>
            <p>
              Plattformen er bygget for det norske arbeidsmarkedet, med
              ATS-vennlig PDF-eksport som leses korrekt av rekrutteringssystemer,
              og et dataminimerende personvern, alle data lagres i EU. Marcus
              Jenshaug driver Søknadsbasen som privatperson, uten investorer og
              uten datasalg.
            </p>
            <p>
              Du kan prøve Søknadsbasen gratis i syv dager, deretter koster det
              79 kr i måneden eller 299 kr som engangsbetaling for seks måneders
              tilgang.{" "}
              <Link href="/guide" className="underline underline-offset-2 hover:text-[#D5592E]">
                Les guidene våre om CV og søknadsbrev
              </Link>
              {" "}eller{" "}
              <Link href="#priser" className="underline underline-offset-2 hover:text-[#D5592E]">
                se prisene
              </Link>
              .
            </p>
          </div>
        </section>

        <section id="produkt" aria-label="Produktdemo">
          <ProductDemo />
        </section>

        <section
          id="filosofi"
          aria-labelledby="filosofi-heading"
          className="max-w-[1100px] mx-auto px-5 md:px-10 pb-20 md:pb-32 grid grid-cols-12 gap-6 md:gap-8"
        >
          <div className="col-span-12 md:col-span-5">
            <SectionLabel tone="accent" className="mb-4">
              Filosofi
            </SectionLabel>
            <h2
              id="filosofi-heading"
              className="text-[32px] md:text-[40px] leading-[1.05] tracking-[-0.025em] font-medium"
            >
              Et verktøy som gir plass, ikke fyller den.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-6 md:col-start-7 space-y-5 md:space-y-6 text-[14px] md:text-[15px] leading-[1.65] text-[#14110e]/75">
            <p>
              Vi bygger ikke en plattform som dytter deg mot å søke mer. Vi bygger
              et sted der du enkelt ser hvor du er, hva som mangler, og hva som
              fortjener din neste time.
            </p>
            <p>
              Du eier dataene. Vi selger dem aldri. CV-er eksporteres til PDF og
              forblir dine, også etter at abonnementet tar slutt.
            </p>
          </div>
        </section>

        <section
          id="funksjoner"
          aria-labelledby="funksjoner-heading"
          className="bg-[#14110e] text-[#faf8f5]"
        >
          <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24 grid grid-cols-12 gap-6">
            <div className="col-span-12 mb-6 md:mb-8">
              <SectionLabel tone="accent" className="mb-3">
                Funksjoner
              </SectionLabel>
              <h2
                id="funksjoner-heading"
                className="text-[36px] md:text-[64px] tracking-[-0.03em] font-medium leading-[1.05]"
              >
                Ett sted. Alt du trenger.
              </h2>
            </div>
            {[
              {
                n: "01",
                t: "CV-bygger",
                d: "Åtte maler. Seks fargepaletter. Fem typografiset. Ubegrenset eksport.",
              },
              {
                n: "02",
                t: "Søknadsbrev",
                d: "Skrives i konteksten av stillingen. Lagrer versjoner automatisk.",
              },
              {
                n: "03",
                t: "Pipeline",
                d: "Kanban med dra-og-slipp. Eller listevisning. Du velger.",
              },
              {
                n: "04",
                t: "Oppgaver & frister",
                d: "Aldri glem en oppfølging. Aldri miss en frist.",
              },
              {
                n: "05",
                t: "Innsikt",
                d: "Forstå hvor dine intervjuer faktisk kommer fra.",
              },
              {
                n: "06",
                t: "ATS-garanti",
                d: "PDF-eksport optimalisert for rekrutteringssystemer.",
              },
            ].map((f) => (
              <div
                key={f.n}
                className="col-span-12 md:col-span-6 border-t border-white/10 pt-5 pb-2"
              >
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-[12px] text-[#D5592E] font-mono">
                    {f.n}
                  </span>
                  <h3 className="text-[20px] md:text-[22px] font-medium tracking-tight">
                    {f.t}
                  </h3>
                </div>
                <p className="text-[14px] text-[#faf8f5]/60 pl-10">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="priser"
          aria-labelledby="priser-heading"
          className="max-w-[1100px] mx-auto px-5 md:px-10 py-20 md:py-28"
        >
          <div className="mb-10 text-center">
            <SectionLabel tone="accent" className="mb-3">
              Priser
            </SectionLabel>
            <h2
              id="priser-heading"
              className="text-[36px] md:text-[56px] tracking-[-0.03em] font-medium leading-[1.05]"
            >
              To enkle valg.
            </h2>
            <p className="mt-4 text-[14px] md:text-[15px] text-[#14110e]/65">
              7 dager gratis prøveperiode på månedlig plan. Kanseller når du vil.
            </p>
          </div>
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
          id="faq"
          aria-labelledby="faq-heading"
          className="max-w-[820px] mx-auto px-5 md:px-10 py-20 md:py-28"
        >
          <div className="mb-10 text-center">
            <SectionLabel tone="accent" className="mb-3">
              Spørsmål og svar
            </SectionLabel>
            <h2
              id="faq-heading"
              className="text-[36px] md:text-[56px] tracking-[-0.03em] font-medium leading-[1.05]"
            >
              Det folk spør om.
            </h2>
          </div>
          <dl className="divide-y divide-black/10 border-t border-b border-black/10">
            {FAQ.map(({ q, a }) => (
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
          aria-label="Kom i gang"
          className="max-w-[1100px] mx-auto px-5 md:px-10 py-20 md:py-32 text-center"
        >
          <h2 className="text-[44px] md:text-[88px] leading-[0.95] tracking-[-0.04em] font-medium mb-8">
            Klar til å
            <br />
            rydde skrivebordet?
          </h2>
          <ClosingCTA />
          <div className="mt-6 text-[12px] text-[#14110e]/50">
            Kanseller før prøveperioden utløper, ingen belastning.
          </div>
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
