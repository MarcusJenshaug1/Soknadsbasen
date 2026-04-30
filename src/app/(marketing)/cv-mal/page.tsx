import Link from "next/link";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { INDUSTRIES } from "@/lib/cv-mal/industries";

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
    <>
      <JsonLdScript data={breadcrumbJsonLd(breadcrumbs)} />

      <main id="main" className="max-w-[1100px] mx-auto px-5 md:px-10 pb-24">
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
    </>
  );
}
