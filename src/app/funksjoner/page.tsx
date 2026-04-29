import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, webApplicationJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { AtsCertifiedBadge } from "@/components/cv/AtsCertifiedBadge";
import { HeaderCTA, ClosingCTA } from "../LandingCTAs";

export const revalidate = 86400;

export const metadata = buildMetadata({
  path: "/funksjoner",
  title: "Funksjoner",
  description:
    "Oversikt over funksjoner i Søknadsbasen, CV-bygger med ATS-eksport, AI-assistert søknadsbrev, pipeline med kanban og innsikt for jobbsøking i Norge.",
});

const BREADCRUMBS = [
  { name: "Søknadsbasen", path: "/" },
  { name: "Funksjoner", path: "/funksjoner" },
];

// SEO-KONTRAKT: Endring av FEATURES må synkroniseres med
// competitors.ts (comparisonTable), jsonld.ts (webApplicationJsonLd.featureList),
// page.tsx (landing funksjons-grid), og PricingCards.tsx.
// Se AGENTS.md "Sammenligning- og pris-sider er kontrakter".
const FEATURES = [
  {
    id: "cv-bygger",
    label: "01",
    title: "CV-bygger med ATS-vennlige maler",
    paragraphs: [
      "CV-byggeren i Søknadsbasen er bygget for det norske arbeidsmarkedet, med åtte profesjonelle maler, seks fargepaletter og fem typografiske oppsett. Hver mal er testet mot rekrutteringssystemer (ATS) slik at maskinell parsing leser ut navn, titler, datoer og punkter uten feil. Du får ubegrenset PDF-eksport, og CV-er kan dupliseres og tilpasses per stilling på minutter.",
      "I motsetning til kreative CV-byggere som vektlegger grafikk, prioriterer Søknadsbasen klar struktur og lesbarhet. Resultater i stedet for oppgaver, omvendt kronologisk rekkefølge og en topp-seksjon som ATS gjenkjenner. Det betyr færre CV-er som blir filtrert ut før et menneske leser dem.",
    ],
    links: [
      { href: "/guide/skrive-cv", label: "Hvordan skrive en CV i 2026" },
      { href: "/guide/ats-cv", label: "CV-en og ATS-systemet" },
      { href: "/guide/om-meg-cv", label: "Skrive «Om meg» på CV-en" },
    ],
  },
  {
    id: "soknadsbrev",
    label: "02",
    title: "AI-assistert søknadsbrev som faktisk treffer",
    paragraphs: [
      "Søknadsbrev-modulen lar deg skrive i konteksten av stillingen, ikke som en frittstående tekst. Du limer inn stillingsannonsen, AI-assistenten foreslår en åpning, en kjerneparagraf og en avslutning som speiler språket og kravene i utlysningen. Du redigerer fritt, og hver versjon lagres automatisk slik at du kan sammenligne formuleringer mot ulike stillinger.",
      "Versjonshåndtering er innebygd. Når du har sendt fem søknader til ulike stillinger, ser du fortsatt nøyaktig hvilken brev-versjon som hører til hvilken arbeidsgiver. Det er der jobbsøking ofte sklir, og det Søknadsbasen løser før det blir et problem.",
    ],
    links: [
      { href: "/guide/soknadsbrev-eksempel", label: "Søknadsbrev: eksempler" },
      { href: "/guide/jobbsoking-plan", label: "Lag en jobbsøkings-plan" },
    ],
  },
  {
    id: "pipeline",
    label: "03",
    title: "Pipeline med kanban og oppfølging",
    paragraphs: [
      "Pipelinen er Søknadsbasens hjerte. Hver stilling du vurderer eller har søkt på blir et kort som flyttes mellom stadier, fra «interessant» via «søkt» og «intervju» til «svar». Kanban-visningen gir deg den visuelle oversikten, mens listevisningen er bedre når du har mange søknader gående samtidig.",
      "Til hvert kort kan du knytte oppgaver, frister og notater. Aldri glem oppfølgingen tre dager etter intervjuet, aldri miss en søknadsfrist. Søknadsbasen erstatter regneark, klistrelapper og tre forskjellige apper med ett tydelig sted å se hvor du står.",
    ],
    links: [
      { href: "/guide/jobbsoking-plan", label: "Hvordan planlegge jobbsøking" },
      { href: "/guide/intervjusporsmaal", label: "Intervjuspørsmål" },
    ],
  },
  {
    id: "innsikt",
    label: "04",
    title: "Innsikt: forstå hva som virker",
    paragraphs: [
      "Innsikt-modulen gir deg en ærlig oversikt over jobbsøkingen din. Hvor kommer intervjuene faktisk fra, Finn, LinkedIn, nettverk eller direkte? Hvor lang er gjennomsnittlig responstid per kanal, og hvilke typer stillinger får raskest svar? Det er datadrevet selvinnsikt for jobbsøkeren.",
      "Vi viser ikke meningsløse vanity-tall. Innsikt er kuratert for det jobbsøkeren faktisk trenger å vite, slik at neste time prioriteres på det som har størst sannsynlighet for å gi resultat.",
    ],
    links: [
      { href: "/guide/lonnsforhandling", label: "Lønnsforhandling, en rolig guide" },
      { href: "/guide/karriereskifte", label: "Karriereskifte" },
    ],
  },
  {
    id: "personvern",
    label: "05",
    title: "Personvern og datakontroll",
    paragraphs: [
      "Alle data lagres i EU, hos Supabase i Stockholm, og hostes via Vercel sin europeiske region. Vi selger ikke data, vi bruker dem ikke til markedsføring og vi deler dem ikke med tredjepart utover det som er nødvendig for å levere tjenesten (Stripe for betaling, OpenAI for AI-funksjoner under streng databehandlingsavtale).",
      "Du eier alt innhold du legger inn. CV-er kan eksporteres til PDF når som helst og forblir dine også etter at abonnementet tar slutt. Sletting av kontoen sletter alle personlige data permanent.",
    ],
    links: [
      { href: "/personvern", label: "Personvernerklæring" },
      { href: "/vilkar", label: "Brukervilkår" },
    ],
  },
];

export default function FunksjonerPage() {
  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript
        data={[webApplicationJsonLd(), breadcrumbJsonLd(BREADCRUMBS)]}
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
          <Link href="/funksjoner" className="text-[#14110e]">
            Funksjoner
          </Link>
          <Link href="/priser" className="hover:text-[#14110e]">
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
          aria-labelledby="funksjoner-heading"
          className="pt-6 md:pt-10 pb-16 md:pb-20 text-center"
        >
          <SectionLabel tone="accent" className="mb-4">
            Funksjoner
          </SectionLabel>
          <h1
            id="funksjoner-heading"
            className="text-[44px] md:text-[72px] leading-[1] tracking-[-0.035em] font-medium mb-6"
          >
            Funksjoner i Søknadsbasen
          </h1>
          <p className="max-w-[680px] mx-auto text-[16px] md:text-[18px] leading-[1.6] text-[#14110e]/70">
            Søknadsbasen er en samlet jobbsøker-plattform for det norske
            arbeidsmarkedet, CV-bygger, AI-assistert søknadsbrev, pipeline og
            innsikt på ett sted. Her er hva som er inkludert i begge planer.
          </p>
          <div className="max-w-[640px] mx-auto mt-8">
            <AtsCertifiedBadge variant="full" />
          </div>
        </section>

        <div className="space-y-16 md:space-y-24">
          {FEATURES.map((f) => (
            <section
              key={f.id}
              id={f.id}
              aria-labelledby={`${f.id}-heading`}
              className="grid grid-cols-12 gap-6 md:gap-10 border-t border-black/10 pt-12 md:pt-16"
            >
              <div className="col-span-12 md:col-span-4">
                <span className="text-[12px] text-[#D5592E] font-mono mb-3 block">
                  {f.label}
                </span>
                <h2
                  id={`${f.id}-heading`}
                  className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.025em] font-medium"
                >
                  {f.title}
                </h2>
              </div>
              <div className="col-span-12 md:col-span-8 space-y-5 text-[15px] md:text-[16px] leading-[1.7] text-[#14110e]/80">
                {f.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {f.links.length > 0 ? (
                  <ul className="pt-3 space-y-2 text-[13px]">
                    {f.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="text-[#D5592E] hover:underline underline-offset-2"
                        >
                          {l.label} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <section
          aria-label="Kom i gang"
          className="pt-24 md:pt-32 text-center"
        >
          <h2 className="text-[32px] md:text-[56px] leading-[1.05] tracking-[-0.03em] font-medium mb-8">
            Klar til å samle alt?
          </h2>
          <ClosingCTA />
          <div className="mt-6 text-[12px] text-[#14110e]/50">
            7 dager gratis prøveperiode. Kanseller når som helst.
          </div>
          <div className="mt-3 text-[13px]">
            <Link href="/priser" className="underline underline-offset-2 hover:text-[#D5592E]">
              Se priser
            </Link>
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
