import Link from "next/link";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;

export const metadata = buildMetadata({
  path: "/personvern-og-data",
  title: "Personvern og datakontroll",
  description:
    "Hvor dataene dine lagres, hva vi gjør med dem, og hvordan du eier alt. Søknadsbasen er bygget i Norge, hostet i EU, og selger ikke data.",
});

const breadcrumbs = [
  { name: "Søknadsbasen", path: "/" },
  { name: "Personvern og data", path: "/personvern-og-data" },
];

export default function PersonvernOgDataPage() {
  return (
    <>
      <JsonLdScript data={breadcrumbJsonLd(breadcrumbs)} />

      <main id="main" className="max-w-[820px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <section className="pt-6 md:pt-10 pb-12">
          <SectionLabel tone="accent" className="mb-4">
            Personvern
          </SectionLabel>
          <h1 className="text-[40px] md:text-[60px] leading-[1.02] tracking-[-0.035em] font-medium mb-6">
            Hvor dataene dine ligger, og hva vi gjør med dem.
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.65] text-[#14110e]/75 max-w-[68ch]">
            Søknadsbasen er bygget i Norge, hostet i EU, og eid av deg. Denne
            siden viser akkurat hvor dataene dine reiser, hvilke systemer som
            ser dem, og hva vi aldri gjør. Den juridiske personvernerklæringen
            ligger på <Link href="/personvern" className="underline underline-offset-2">/personvern</Link>.
          </p>
        </section>

        <section
          aria-labelledby="arkitektur-heading"
          className="border-t border-black/10 pt-12 pb-12"
        >
          <h2
            id="arkitektur-heading"
            className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.025em] font-medium mb-8"
          >
            Slik flyter dataene dine
          </h2>

          <div className="rounded-2xl border border-black/10 bg-[#eee9df]/50 p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <ArchBox
                step="1"
                title="Du"
                location="Hvor du sitter"
                description="Din nettleser eller PWA. CV-data redigeres lokalt og synkroniseres til server ved lagring."
              />
              <ArchArrow />
              <ArchBox
                step="2"
                title="Vercel EU"
                location="Frankfurt / Stockholm"
                description="Hosting og applikasjonslogikk. Forespørsler rutes via europeiske edge-noder. Ingen amerikanske servere."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6">
              <ArchArrow vertical />
              <ArchBox
                step="3"
                title="Supabase"
                location="Stockholm, Sverige"
                description="Postgres-database og autentisering. Dataene dine (CV-er, søknadsbrev, pipeline) ligger her, kryptert i hvile."
                highlight
              />
              <ArchArrow vertical />
            </div>
            <div className="mt-4 md:mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <ArchBox
                step="4a"
                title="Stripe"
                location="Irland (EU)"
                description="Bare for betaling. Vi sender ikke CV-data hit, kun navn, e-post og fakturerings-info."
                muted
              />
              <ArchBox
                step="4b"
                title="Google Gemini"
                location="EU-region"
                description="AI-generering av søknadsbrev og CV-sammendrag. Sender bare den teksten du ber om at AI-en skal bearbeide. Lagres ikke til trening."
                muted
              />
              <ArchBox
                step="4c"
                title="Vercel Analytics"
                location="EU"
                description="Anonymisert sidetrafikk-måling. Ingen personopplysninger, ingen cross-site-cookies."
                muted
              />
            </div>
          </div>
        </section>

        <section className="border-t border-black/10 pt-12 pb-12">
          <h2 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.025em] font-medium mb-8">
            Det vi aldri gjør
          </h2>
          <ul className="space-y-3 text-[15px] leading-[1.65] text-[#14110e]/85">
            <NeverItem>
              Selger CV-er, søknadsbrev eller kontaktinformasjon til
              rekrutteringsbyråer, dataanalyse-firmaer eller noen andre.
            </NeverItem>
            <NeverItem>
              Bruker dataene dine til å trene AI-modeller. Verken vår egen AI
              eller tredjeparts.
            </NeverItem>
            <NeverItem>
              Sender personopplysninger ut av EU. All lagring og prosessering er
              i Sverige eller andre EU-land.
            </NeverItem>
            <NeverItem>
              Bruker markedsføring-cookies eller tracking-pixler fra Meta,
              Google Ads, TikTok eller liknende.
            </NeverItem>
            <NeverItem>
              Profilerer deg basert på CV-en din. AI-en jobber per forespørsel,
              ikke som en kontinuerlig modell av deg.
            </NeverItem>
          </ul>
        </section>

        <section className="border-t border-black/10 pt-12 pb-12">
          <h2 className="text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.025em] font-medium mb-8">
            Det vi alltid gjør
          </h2>
          <ul className="space-y-3 text-[15px] leading-[1.65] text-[#14110e]/85">
            <AlwaysItem>
              Lar deg eksportere alt: CV-er som PDF, pipeline-data som CSV,
              søknadsbrev som tekst. Når som helst, så mange ganger du vil.
            </AlwaysItem>
            <AlwaysItem>
              Sletter alle personlige data permanent når du sletter kontoen.
              Ingen 90-dagers «vi-beholder-i-tilfelle»-periode.
            </AlwaysItem>
            <AlwaysItem>
              Krypterer dataene i hvile (Supabase) og i transitt (TLS 1.3).
            </AlwaysItem>
            <AlwaysItem>
              Følger GDPR. Du har rett til innsyn, retting, sletting og
              dataportabilitet, og vi gjør det enkelt å bruke disse rettighetene.
            </AlwaysItem>
            <AlwaysItem>
              Driver hele plattformen i EU. Norske krav til personvern er
              minimumsnivået, ikke ambisjonen.
            </AlwaysItem>
          </ul>
        </section>

        <section className="border-t border-black/10 pt-12 pb-12">
          <h2 className="text-[22px] md:text-[28px] leading-[1.1] tracking-[-0.025em] font-medium mb-6">
            Hvem står bak
          </h2>
          <p className="text-[15px] leading-[1.7] text-[#14110e]/80 max-w-[68ch]">
            Søknadsbasen drives av Marcus Jenshaug som privatperson. Ingen
            investorer, ingen styre, ingen krav om å monetisere brukerdata.
            Drift dekkes av abonnement (79 kr/mnd) og engangsbetaling (299 kr
            for 6 måneder). Ingenting annet.
          </p>
          <p className="text-[15px] leading-[1.7] text-[#14110e]/80 max-w-[68ch] mt-4">
            Spørsmål om data eller personvern?{" "}
            <a
              href="mailto:marcus@jenshaug.no"
              className="underline underline-offset-2 hover:text-[#D5592E]"
            >
              marcus@jenshaug.no
            </a>
            .
          </p>
        </section>

        <section className="border-t border-black/10 pt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/personvern"
            className="border border-black/10 rounded-2xl p-6 hover:border-ink/30 transition-colors"
          >
            <div className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/50 mb-2">
              Juridisk
            </div>
            <div className="text-[18px] font-medium mb-1">
              Personvernerklæring
            </div>
            <p className="text-[13px] text-[#14110e]/65">
              Den fulle juridiske teksten om hvordan vi behandler personopplysninger.
            </p>
          </Link>
          <Link
            href="/vilkar"
            className="border border-black/10 rounded-2xl p-6 hover:border-ink/30 transition-colors"
          >
            <div className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/50 mb-2">
              Juridisk
            </div>
            <div className="text-[18px] font-medium mb-1">Brukervilkår</div>
            <p className="text-[13px] text-[#14110e]/65">
              Avtalen mellom deg og Søknadsbasen som tjeneste.
            </p>
          </Link>
        </section>
      </main>
    </>
  );
}

function ArchBox({
  step,
  title,
  location,
  description,
  highlight,
  muted,
}: {
  step: string;
  title: string;
  location: string;
  description: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border-2 border-[#D5592E] bg-[#D5592E]/5 p-5"
          : muted
            ? "rounded-xl border border-black/10 bg-white/40 p-5"
            : "rounded-xl border border-black/10 bg-white p-5"
      }
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[10px] font-mono text-[#D5592E]">{step}</span>
        <h3 className="text-[14px] md:text-[15px] font-medium tracking-tight">
          {title}
        </h3>
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-[#14110e]/50 mb-2">
        {location}
      </div>
      <p className="text-[12px] leading-[1.55] text-[#14110e]/75">
        {description}
      </p>
    </div>
  );
}

function ArchArrow({ vertical }: { vertical?: boolean }) {
  return (
    <div className="hidden md:flex items-center justify-center text-[#D5592E]/60">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={vertical ? "rotate-90" : ""}
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </div>
  );
}

function NeverItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 size-1.5 rounded-full bg-[#D5592E] shrink-0" />
      <span>
        <strong className="font-medium text-[#14110e]">Aldri.</strong>{" "}
        {children}
      </span>
    </li>
  );
}

function AlwaysItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 size-1.5 rounded-full bg-emerald-600 shrink-0" />
      <span>
        <strong className="font-medium text-[#14110e]">Alltid.</strong>{" "}
        {children}
      </span>
    </li>
  );
}
