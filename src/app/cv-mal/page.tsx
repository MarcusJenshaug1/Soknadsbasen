import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { INDUSTRIES } from "@/lib/cv-mal/industries";
import { HeaderCTA } from "../LandingCTAs";

export const revalidate = 86400;

export const metadata = buildMetadata({
  path: "/cv-mal",
  title: "CV-maler etter bransje",
  description:
    "ATS-vennlige CV-maler skreddersydd for norske bransjer: helse, IT, undervisning, bygg, salg, økonomi, design, jus, transport og restaurant.",
});

const breadcrumbs = [
  { name: "Søknadsbasen", path: "/" },
  { name: "CV-mal", path: "/cv-mal" },
];

export default function CvMalHubPage() {
  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript data={breadcrumbJsonLd(breadcrumbs)} />

      <header className="max-w-[1200px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <nav
          aria-label="Hovedmeny"
          className="hidden md:flex items-center gap-9 text-[13px] text-[#14110e]/70"
        >
          <Link href="/funksjoner" className="hover:text-[#14110e]">
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
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <section className="pt-6 md:pt-10 pb-12 md:pb-16 max-w-[680px]">
          <SectionLabel tone="accent" className="mb-4">
            CV-maler
          </SectionLabel>
          <h1 className="text-[40px] md:text-[60px] leading-[1.02] tracking-[-0.035em] font-medium mb-6">
            CV-mal for din bransje
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.65] text-[#14110e]/75">
            Hver bransje har sine egne forventninger til CV-en. Sertifiseringer
            betyr ulike ting for sykepleieren og snekkeren, og rekrutterere
            skanner etter forskjellige nøkkelord. Velg bransjen din for en
            skreddersydd mal med ATS-vennlig struktur og konkrete eksempler.
          </p>
        </section>

        <section
          aria-label="Bransjer"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {INDUSTRIES.map((i) => (
            <Link
              key={i.slug}
              href={`/cv-mal/${i.slug}`}
              className="border border-black/10 rounded-2xl p-6 hover:border-ink/30 transition-colors"
            >
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#D5592E] mb-3">
                {i.name}
              </div>
              <div className="text-[18px] md:text-[20px] font-medium tracking-tight mb-2">
                CV-mal for {i.shortName}
              </div>
              <p className="text-[13px] leading-[1.6] text-[#14110e]/65">
                {i.metaDescription}
              </p>
            </Link>
          ))}
        </section>
      </main>

      <footer className="border-t border-black/10 mt-12">
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
          </span>
        </div>
      </footer>
    </div>
  );
}
