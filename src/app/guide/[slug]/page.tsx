import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { Logo } from "@/components/ui/Logo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { GuideHeader, GuideTldr } from "@/components/guide/GuideHeader";
import { TOC } from "@/components/guide/TOC";
import { Prose } from "@/components/guide/Prose";
import { GuideCTAInline } from "@/components/guide/GuideCTAInline";
import { RelatedGuides } from "@/components/guide/RelatedGuides";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  type JsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllGuideSlugs, getGuide } from "@/lib/guide/loader";

export const revalidate = 86400;
export const dynamicParams = false;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return buildMetadata({ path: `/guide/${slug}`, noindex: true });
  const { frontmatter: fm } = guide;
  return buildMetadata({
    path: `/guide/${fm.slug}`,
    title: fm.title,
    description: fm.description,
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  const { frontmatter: fm, htmlTop, htmlBottom, toc, wordCount } = guide;

  const jsonLdPayload: JsonLd[] = [
    breadcrumbJsonLd([
      { name: "Søknadsbasen", path: "/" },
      { name: "Guide", path: "/guide" },
      { name: fm.title, path: `/guide/${fm.slug}` },
    ]),
  ];

  if (fm.schema === "HowTo" && fm.howToSteps && fm.howToSteps.length > 0) {
    jsonLdPayload.push(
      howToJsonLd({
        name: fm.title,
        description: fm.description,
        path: `/guide/${fm.slug}`,
        steps: fm.howToSteps,
        totalTime: fm.howToTotalTime,
      }),
    );
  } else {
    jsonLdPayload.push(
      articleJsonLd({
        headline: fm.title,
        description: fm.description,
        path: `/guide/${fm.slug}`,
        datePublished: fm.publishedAt,
        dateModified: fm.updatedAt ?? fm.publishedAt,
        author: fm.author,
        wordCount,
      }),
    );
  }

  if (fm.faq && fm.faq.length > 0) {
    jsonLdPayload.push(faqJsonLd(fm.faq));
  }

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript data={jsonLdPayload} />

      <header className="max-w-[1200px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <Link
          href="/guide"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#14110e]/65 hover:text-[#14110e]"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          Alle guider
        </Link>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs
            items={[
              { name: "Søknadsbasen", path: "/" },
              { name: "Guide", path: "/guide" },
              { name: fm.title, path: `/guide/${fm.slug}` },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-3 order-2 lg:order-1">
            <TOC items={toc} />
          </div>

          <article className="lg:col-span-9 order-1 lg:order-2 max-w-[720px]">
            <GuideHeader guide={guide} />
            <GuideTldr tldr={fm.tldr ?? []} />
            <Prose html={htmlTop} />
            {fm.ctaMid ? <GuideCTAInline cta={fm.ctaMid} variant="mid" /> : null}
            <Prose html={htmlBottom} />
            {fm.ctaEnd ? <GuideCTAInline cta={fm.ctaEnd} variant="end" /> : null}
            {fm.faq && fm.faq.length > 0 ? (
              <section
                aria-labelledby="faq-heading"
                className="mt-16 border-t border-black/10 pt-12"
              >
                <h2
                  id="faq-heading"
                  className="text-[26px] md:text-[32px] tracking-[-0.02em] font-medium mb-8"
                >
                  Ofte stilte spørsmål
                </h2>
                <dl className="divide-y divide-black/10 border-t border-b border-black/10">
                  {fm.faq.map(({ q, a }) => (
                    <div key={q} className="py-6">
                      <dt className="text-[16px] md:text-[18px] font-medium mb-2">
                        {q}
                      </dt>
                      <dd className="text-[14px] md:text-[15px] leading-[1.7] text-[#14110e]/75">
                        {a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            <RelatedGuides slugs={fm.related ?? []} />
          </article>
        </div>
      </main>

      <footer className="border-t border-black/10">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 flex flex-wrap items-center justify-between text-[12px] text-[#14110e]/55 gap-4">
          <span>© 2026 Søknadsbasen</span>
          <span className="flex items-center gap-3">
            <Link href="/guide" className="hover:text-[#14110e]">
              Flere guider
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
