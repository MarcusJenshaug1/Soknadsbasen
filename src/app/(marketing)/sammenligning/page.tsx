import Link from "next/link";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { COMPETITORS } from "@/lib/sammenligning/competitors";

export const revalidate = 86400;

export const metadata = buildMetadata({
  path: "/sammenligning",
  title: "Sammenlign Søknadsbasen",
  description:
    "Sammenlign Søknadsbasen med CV.no, regneark og andre alternativer. Funksjoner, pris og når du bør velge hva.",
});

const breadcrumbs = [
  { name: "Søknadsbasen", path: "/" },
  { name: "Sammenligning", path: "/sammenligning" },
];

export default function SammenligningHubPage() {
  return (
    <>
      <JsonLdScript data={breadcrumbJsonLd(breadcrumbs)} />

      <main id="main" className="max-w-[900px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <section className="pt-6 md:pt-10 pb-12 md:pb-16">
          <SectionLabel tone="accent" className="mb-4">
            Sammenligning
          </SectionLabel>
          <h1 className="text-[40px] md:text-[60px] leading-[1.02] tracking-[-0.035em] font-medium mb-6">
            Søknadsbasen sammenlignet
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.65] text-[#14110e]/75 max-w-[68ch]">
            Vi prøver å være ærlige om hvor Søknadsbasen passer, og hvor andre
            verktøy kan være bedre valg. Velg det alternativet du vurderer
            for en grundig side ved side-sammenligning.
          </p>
        </section>

        <section
          aria-label="Sammenligninger"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {COMPETITORS.map((c) => (
            <Link
              key={c.slug}
              href={`/sammenligning/${c.slug}`}
              className="border border-black/10 rounded-2xl p-6 hover:border-ink/30 transition-colors"
            >
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#D5592E] mb-3">
                {c.category}
              </div>
              <div className="text-[20px] md:text-[22px] font-medium tracking-tight mb-3">
                Søknadsbasen vs {c.name}
              </div>
              <p className="text-[13px] leading-[1.6] text-[#14110e]/65 line-clamp-3">
                {c.intro[0]}
              </p>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
