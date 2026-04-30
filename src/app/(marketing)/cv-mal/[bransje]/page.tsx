import { notFound } from "next/navigation";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  type JsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import {
  getIndustryBySlug,
  getAllIndustrySlugs,
} from "@/lib/cv-mal/industries";
import { ClosingCTA } from "@/components/marketing/LandingCTAs";

export const revalidate = 86400;
export const dynamicParams = false;

type Props = {
  params: Promise<{ bransje: string }>;
};

export async function generateStaticParams() {
  return getAllIndustrySlugs().map((bransje) => ({ bransje }));
}

export async function generateMetadata({ params }: Props) {
  const { bransje } = await params;
  const i = getIndustryBySlug(bransje);
  if (!i) return buildMetadata({ path: `/cv-mal/${bransje}`, noindex: true });
  return buildMetadata({
    path: `/cv-mal/${i.slug}`,
    title: i.metaTitle,
    description: i.metaDescription,
  });
}

export default async function CvMalPage({ params }: Props) {
  const { bransje } = await params;
  const i = getIndustryBySlug(bransje);
  if (!i) notFound();

  const breadcrumbs = [
    { name: "Søknadsbasen", path: "/" },
    { name: "CV-mal", path: "/cv-mal" },
    { name: i.name, path: `/cv-mal/${i.slug}` },
  ];

  const jsonLd: JsonLd[] = [
    breadcrumbJsonLd(breadcrumbs),
    articleJsonLd({
      headline: `${i.metaTitle} 2026`,
      description: i.metaDescription,
      path: `/cv-mal/${i.slug}`,
      datePublished: i.publishedAt,
      author: { name: "Marcus Jenshaug", url: absoluteUrl("/om") },
    }),
    faqJsonLd(i.faq),
  ];

  return (
    <>
      <JsonLdScript data={jsonLd} />

      <main id="main" className="max-w-[820px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <section className="pt-6 md:pt-10 pb-10 md:pb-14">
          <SectionLabel tone="accent" className="mb-4">
            CV-mal
          </SectionLabel>
          <h1 className="text-[40px] md:text-[60px] leading-[1.02] tracking-[-0.035em] font-medium mb-6">
            CV-mal for {i.shortName}
          </h1>
          <div className="space-y-5 text-[16px] md:text-[17px] leading-[1.65] text-[#14110e]/80 max-w-[68ch]">
            {i.intro.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>

        <section className="border-t border-black/10 pt-12 pb-10">
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-4">
            Anbefalt mal: {i.recommendedTemplate}
          </h2>
          <p className="text-[15px] leading-[1.7] text-[#14110e]/80 max-w-[68ch]">
            {i.templateReason}
          </p>
        </section>

        <section className="border-t border-black/10 pt-12 pb-10">
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-6">
            {i.aboutSection.heading}
          </h2>
          <div className="space-y-4 text-[15px] leading-[1.7] text-[#14110e]/80 max-w-[68ch]">
            {i.aboutSection.body.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>

        <section className="border-t border-black/10 pt-12 pb-10">
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-6">
            Nøkkelord rekrutterere ser etter
          </h2>
          <div className="flex flex-wrap gap-2">
            {i.keywordsToInclude.map((k) => (
              <span
                key={k}
                className="px-3 py-1.5 rounded-full text-[13px] bg-black/5 text-[#14110e]/80"
              >
                {k}
              </span>
            ))}
          </div>
        </section>

        <section className="border-t border-black/10 pt-12 pb-10">
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-4">
            Eksempel på sammendrag
          </h2>
          <blockquote className="border-l-4 border-[#D5592E] pl-5 py-2 text-[15px] md:text-[16px] leading-[1.7] text-[#14110e]/85 italic">
            {i.exampleSummary}
          </blockquote>
        </section>

        <section className="border-t border-black/10 pt-12 pb-10">
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-6">
            Eksempler på resultat-bullets
          </h2>
          <ul className="space-y-3 text-[15px] leading-[1.7] text-[#14110e]/80 max-w-[68ch]">
            {i.exampleAchievements.map((a, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="text-[#D5592E] mt-1.5 flex-shrink-0">●</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-black/10 pt-12 pb-10">
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-6">
            Vanlige feil for {i.shortName}-CV
          </h2>
          <ul className="space-y-3 text-[15px] leading-[1.7] text-[#14110e]/80 max-w-[68ch]">
            {i.commonMistakes.map((m, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="text-[#14110e]/40 mt-1.5 flex-shrink-0">−</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-black/10 pt-12 pb-10">
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-4">
            Roller denne malen passer for
          </h2>
          <p className="text-[15px] leading-[1.7] text-[#14110e]/80">
            {i.relatedRoles.join(", ")}.
          </p>
        </section>

        <section
          id="faq"
          className="border-t border-black/10 pt-12 pb-10"
        >
          <h2 className="text-[24px] md:text-[30px] tracking-[-0.02em] font-medium mb-6">
            Vanlige spørsmål
          </h2>
          <dl className="divide-y divide-black/10 border-t border-b border-black/10">
            {i.faq.map(({ q, a }) => (
              <div key={q} className="py-5">
                <dt className="text-[16px] font-medium mb-2">{q}</dt>
                <dd className="text-[14px] md:text-[15px] leading-[1.7] text-[#14110e]/75">
                  {a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="pt-12 md:pt-16 text-center">
          <h2 className="text-[28px] md:text-[40px] leading-[1.1] tracking-[-0.025em] font-medium mb-6">
            Bygg CV-en nå
          </h2>
          <p className="text-[14px] text-[#14110e]/65 max-w-[480px] mx-auto mb-6">
            Søknadsbasen har en mal som passer for {i.shortName}-CV-er, ATS-vennlig
            og klar til PDF-eksport.
          </p>
          <ClosingCTA />
        </section>
      </main>
    </>
  );
}
