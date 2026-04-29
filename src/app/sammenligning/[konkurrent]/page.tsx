import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  webApplicationJsonLd,
  type JsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import {
  COMPETITORS,
  getCompetitorBySlug,
  getAllCompetitorSlugs,
  type ComparisonValue,
} from "@/lib/sammenligning/competitors";
import { HeaderCTA, ClosingCTA } from "../../LandingCTAs";

export const revalidate = 86400;
export const dynamicParams = false;

type Props = {
  params: Promise<{ konkurrent: string }>;
};

export async function generateStaticParams() {
  return getAllCompetitorSlugs().map((konkurrent) => ({ konkurrent }));
}

export async function generateMetadata({ params }: Props) {
  const { konkurrent } = await params;
  const c = getCompetitorBySlug(konkurrent);
  if (!c) return buildMetadata({ path: `/sammenligning/${konkurrent}`, noindex: true });
  return buildMetadata({
    path: `/sammenligning/${c.slug}`,
    title: `Søknadsbasen vs ${c.name}`,
    description: `Ærlig sammenligning av Søknadsbasen og ${c.name}. Funksjoner, pris, og når du bør velge hvilken for jobbsøking i Norge.`,
  });
}

function renderValue(v: ComparisonValue): React.ReactNode {
  if (v === "yes")
    return <span className="text-[#D5592E]">Ja</span>;
  if (v === "no") return <span className="text-[#14110e]/40">Nei</span>;
  if (v === "partial")
    return <span className="text-[#14110e]/70">Delvis</span>;
  return <span>{v}</span>;
}

export default async function SammenligningPage({ params }: Props) {
  const { konkurrent } = await params;
  const c = getCompetitorBySlug(konkurrent);
  if (!c) notFound();

  const breadcrumbs = [
    { name: "Søknadsbasen", path: "/" },
    { name: "Sammenligning", path: "/sammenligning" },
    { name: c.name, path: `/sammenligning/${c.slug}` },
  ];

  const jsonLd: JsonLd[] = [
    breadcrumbJsonLd(breadcrumbs),
    webApplicationJsonLd(),
    articleJsonLd({
      headline: `Søknadsbasen vs ${c.name}`,
      description: `Ærlig sammenligning av Søknadsbasen og ${c.name}.`,
      path: `/sammenligning/${c.slug}`,
      datePublished: c.publishedAt,
      author: { name: "Marcus Jenshaug", url: absoluteUrl("/om") },
    }),
    faqJsonLd(c.faq),
  ];

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript data={jsonLd} />

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

      <main className="max-w-[900px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <section className="pt-6 md:pt-10 pb-12 md:pb-16">
          <SectionLabel tone="accent" className="mb-4">
            Sammenligning
          </SectionLabel>
          <h1 className="text-[40px] md:text-[64px] leading-[1.02] tracking-[-0.035em] font-medium mb-6">
            Søknadsbasen vs {c.name}
          </h1>
          <div className="space-y-5 text-[16px] md:text-[17px] leading-[1.65] text-[#14110e]/80 max-w-[68ch]">
            {c.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="border-t border-black/10 pt-12 md:pt-16 pb-12 md:pb-16">
          <h2 className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.025em] font-medium mb-6">
            Hva er hva
          </h2>
          <div className="space-y-4 text-[15px] md:text-[16px] leading-[1.7] text-[#14110e]/80 max-w-[68ch]">
            {c.whatItIs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="cmp-heading"
          className="border-t border-black/10 pt-12 md:pt-16 pb-12 md:pb-16"
        >
          <h2
            id="cmp-heading"
            className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.025em] font-medium mb-8"
          >
            Funksjoner side ved side
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] md:text-[15px] border-collapse">
              <thead>
                <tr className="border-b-2 border-black/15">
                  <th className="text-left py-3 pr-4 font-medium">Funksjon</th>
                  <th className="text-left py-3 px-4 font-medium">
                    Søknadsbasen
                  </th>
                  <th className="text-left py-3 pl-4 font-medium">{c.shortName}</th>
                </tr>
              </thead>
              <tbody>
                {c.comparisonTable.map((row) => (
                  <tr key={row.feature} className="border-b border-black/8">
                    <td className="py-3 pr-4 text-[#14110e]/85">{row.feature}</td>
                    <td className="py-3 px-4">{renderValue(row.soknadsbasen)}</td>
                    <td className="py-3 pl-4">{renderValue(row.competitor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-black/10 pt-12 md:pt-16 pb-12 md:pb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-[22px] md:text-[26px] font-medium mb-5">
              Hva {c.shortName} gjør bra
            </h2>
            <ul className="space-y-2.5 text-[14px] md:text-[15px] leading-[1.6] text-[#14110e]/80">
              {c.competitorStrengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#D5592E] mt-1">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[22px] md:text-[26px] font-medium mb-5">
              Hvor {c.shortName} kommer til kort
            </h2>
            <ul className="space-y-2.5 text-[14px] md:text-[15px] leading-[1.6] text-[#14110e]/80">
              {c.competitorWeaknesses.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#14110e]/40 mt-1">−</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-black/10 pt-12 md:pt-16 pb-12 md:pb-16">
          <h2 className="text-[22px] md:text-[26px] font-medium mb-5">
            Hva Søknadsbasen tilbyr utover
          </h2>
          <ul className="space-y-2.5 text-[14px] md:text-[15px] leading-[1.6] text-[#14110e]/80 max-w-[68ch]">
            {c.soknadsbasenStrengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#D5592E] mt-1">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-black/10 pt-12 md:pt-16 pb-12 md:pb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-black/5 rounded-2xl p-6 md:p-8">
            <h3 className="text-[18px] md:text-[20px] font-medium mb-3">
              Velg {c.shortName}
            </h3>
            <p className="text-[14px] md:text-[15px] leading-[1.65] text-[#14110e]/75">
              {c.whenToChooseCompetitor}
            </p>
          </div>
          <div className="bg-[#14110e] text-[#faf8f5] rounded-2xl p-6 md:p-8">
            <h3 className="text-[18px] md:text-[20px] font-medium mb-3">
              Velg Søknadsbasen
            </h3>
            <p className="text-[14px] md:text-[15px] leading-[1.65] text-[#faf8f5]/80">
              {c.whenToChooseSoknadsbasen}
            </p>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="cmp-faq-heading"
          className="border-t border-black/10 pt-12 md:pt-16 pb-12 md:pb-16"
        >
          <h2
            id="cmp-faq-heading"
            className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.025em] font-medium mb-8"
          >
            Vanlige spørsmål
          </h2>
          <dl className="divide-y divide-black/10 border-t border-b border-black/10">
            {c.faq.map(({ q, a }) => (
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

        <section className="pt-12 md:pt-16 text-center">
          <h2 className="text-[28px] md:text-[44px] leading-[1.1] tracking-[-0.025em] font-medium mb-6">
            Klar til å prøve Søknadsbasen?
          </h2>
          <ClosingCTA />
          <div className="mt-4 text-[12px] text-[#14110e]/55">
            7 dager gratis. Kanseller når som helst.
          </div>
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

export { COMPETITORS };
