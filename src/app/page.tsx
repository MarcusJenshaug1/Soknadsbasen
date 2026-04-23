import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import { getSession } from "@/lib/auth";
import { PricingCards } from "@/components/pricing/PricingCards";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY!;
  const oneTimePriceId = process.env.STRIPE_PRICE_ONETIME!;

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      {/* Nav */}
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <div className="hidden md:flex items-center gap-9 text-[13px] text-[#14110e]/70">
          <Link href="#produkt" className="hover:text-[#14110e]">
            Produkt
          </Link>
          <Link href="#filosofi" className="hover:text-[#14110e]">
            Filosofi
          </Link>
          <Link href="#funksjoner" className="hover:text-[#14110e]">
            Funksjoner
          </Link>
          <Link href="#priser" className="hover:text-[#14110e]">
            Priser
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <Link
              href="/app"
              className="text-[13px] px-4 py-2 rounded-full bg-[#14110e] text-[#faf8f5] hover:bg-[#c15a3a] transition-colors"
            >
              Åpne basen
            </Link>
          ) : (
            <>
              <Link
                href="/logg-inn"
                className="hidden sm:inline-flex text-[13px] px-3 py-2 text-[#14110e]/70 hover:text-[#14110e]"
              >
                Logg inn
              </Link>
              <Link
                href="/registrer"
                className="text-[13px] px-4 py-2 rounded-full bg-[#14110e] text-[#faf8f5] hover:bg-[#c15a3a] transition-colors"
              >
                Kom i gang
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-[1100px] mx-auto px-5 md:px-10 pt-16 md:pt-24 pb-20 md:pb-32 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] text-[#14110e]/55 mb-10">
          <span className="w-1 h-1 rounded-full bg-[#c15a3a]" />
          Ny utgave 2026
          <span className="w-1 h-1 rounded-full bg-[#c15a3a]" />
        </div>
        <h1 className="text-[56px] sm:text-[72px] md:text-[120px] leading-[0.95] font-medium tracking-[-0.045em] mb-8 md:mb-10">
          Jobbsøking,
          <br />
          med ro.
        </h1>
        <p className="text-[16px] md:text-[19px] leading-[1.6] max-w-[560px] mx-auto text-[#14110e]/65 mb-10 md:mb-12">
          Søknadsbasen samler CV-er, brev og oppfølging i ett tydelig arbeidsrom.
          Bygget for å bli mindre stresset — ikke mer distrahert.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={session ? "/app" : "/registrer"}
            className="px-6 py-3.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[14px] font-medium hover:bg-[#c15a3a] transition-colors"
          >
            {session ? "Åpne basen" : "Start din base"}
          </Link>
          <Link
            href="#produkt"
            className="px-6 py-3.5 rounded-full text-[14px] text-[#14110e]/70 hover:text-[#14110e] hover:bg-black/5 transition-colors inline-flex items-center gap-1.5"
          >
            Se demo <span className="text-[#c15a3a]">→</span>
          </Link>
        </div>
      </div>

      {/* Product photo */}
      <div id="produkt" className="max-w-[1200px] mx-auto px-5 md:px-10 pb-20 md:pb-32">
        <div className="bg-[#eee9df] rounded-[24px] md:rounded-[32px] p-6 md:p-16 relative overflow-hidden">
          <div className="absolute top-4 md:top-6 left-5 md:left-8 text-[10px] uppercase tracking-[0.2em] text-[#14110e]/45">
            Pipeline
          </div>
          <div className="absolute top-4 md:top-6 right-5 md:right-8 text-[10px] uppercase tracking-[0.2em] text-[#14110e]/45">
            Våren 2026
          </div>

          <div className="mt-10 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { h: "Kladd", c: 2, col: "#94a3b8" },
              { h: "Sendt", c: 5, col: "#c15a3a" },
              { h: "Intervju", c: 2, col: "#14110e" },
              { h: "Tilbud", c: 1, col: "#16a34a" },
            ].map((g) => (
              <div key={g.h} className="bg-white rounded-2xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-3 md:mb-4 pb-2 md:pb-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: g.col }}
                    />
                    <span className="text-[12px] font-medium">{g.h}</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">{g.c}</span>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: g.c }).map((_, j) => (
                    <div
                      key={j}
                      className="p-2.5 md:p-3 rounded-xl bg-[#faf8f5] border border-black/5"
                    >
                      <div className="h-2 w-20 rounded-full bg-neutral-200 mb-2" />
                      <div className="h-1.5 w-14 rounded-full bg-neutral-100" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Philosophy */}
      <div
        id="filosofi"
        className="max-w-[1100px] mx-auto px-5 md:px-10 pb-20 md:pb-32 grid grid-cols-12 gap-6 md:gap-8"
      >
        <div className="col-span-12 md:col-span-5">
          <SectionLabel tone="accent" className="mb-4">
            Filosofi
          </SectionLabel>
          <h2 className="text-[32px] md:text-[40px] leading-[1.05] tracking-[-0.025em] font-medium">
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
            forblir dine — også etter at abonnementet tar slutt.
          </p>
        </div>
      </div>

      {/* Features */}
      <div id="funksjoner" className="bg-[#14110e] text-[#faf8f5]">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24 grid grid-cols-12 gap-6">
          <div className="col-span-12 mb-6 md:mb-8">
            <SectionLabel tone="accent" className="mb-3">
              Funksjoner
            </SectionLabel>
            <h2 className="text-[36px] md:text-[64px] tracking-[-0.03em] font-medium leading-[1.05]">
              Ett sted. Alt du trenger.
            </h2>
          </div>
          {[
            { n: "01", t: "CV-bygger", d: "Åtte maler. Seks fargepaletter. Fem typografiset. Ubegrenset eksport." },
            { n: "02", t: "Søknadsbrev", d: "Skrives i konteksten av stillingen. Lagrer versjoner automatisk." },
            { n: "03", t: "Pipeline", d: "Kanban med dra-og-slipp. Eller listevisning. Du velger." },
            { n: "04", t: "Oppgaver & frister", d: "Aldri glem en oppfølging. Aldri miss en frist." },
            { n: "05", t: "Innsikt", d: "Forstå hvor dine intervjuer faktisk kommer fra." },
            { n: "06", t: "ATS-garanti", d: "PDF-eksport optimalisert for rekrutteringssystemer." },
          ].map((f) => (
            <div
              key={f.n}
              className="col-span-12 md:col-span-6 border-t border-white/10 pt-5 pb-2"
            >
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-[12px] text-[#c15a3a] font-mono">{f.n}</span>
                <h3 className="text-[20px] md:text-[22px] font-medium tracking-tight">
                  {f.t}
                </h3>
              </div>
              <p className="text-[14px] text-[#faf8f5]/60 pl-10">{f.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div
        id="priser"
        className="max-w-[1100px] mx-auto px-5 md:px-10 py-20 md:py-28"
      >
        <div className="mb-10 text-center">
          <SectionLabel tone="accent" className="mb-3">
            Priser
          </SectionLabel>
          <h2 className="text-[36px] md:text-[56px] tracking-[-0.03em] font-medium leading-[1.05]">
            To enkle valg.
          </h2>
          <p className="mt-4 text-[14px] md:text-[15px] text-[#14110e]/65">
            7 dager gratis prøveperiode på månedlig plan. Kanseller når du vil.
          </p>
        </div>
        <PricingCards
          loggedIn={session !== null}
          monthlyPriceId={monthlyPriceId}
          oneTimePriceId={oneTimePriceId}
        />
      </div>

      {/* Closing */}
      <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-20 md:py-32 text-center">
        <h2 className="text-[44px] md:text-[88px] leading-[0.95] tracking-[-0.04em] font-medium mb-8">
          Klar til å
          <br />
          rydde skrivebordet?
        </h2>
        <Link
          href={session ? "/app" : "/registrer"}
          className="inline-flex px-8 py-4 rounded-full bg-[#14110e] text-[#faf8f5] text-[15px] font-medium hover:bg-[#c15a3a] transition-colors"
        >
          {session ? "Åpne basen" : "Start med 7 dager gratis"}
        </Link>
        <div className="mt-6 text-[12px] text-[#14110e]/50">
          Kanseller før prøveperioden utløper — ingen belastning.
        </div>
      </div>

      <div className="border-t border-black/10">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 flex flex-wrap items-center justify-between text-[12px] text-[#14110e]/55 gap-4">
          <span>© 2026 Søknadsbasen</span>
          <span>Oslo · Norge</span>
          <span className="flex items-center gap-3">
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
      </div>
    </div>
  );
}
