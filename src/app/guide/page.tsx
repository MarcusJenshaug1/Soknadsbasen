import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Logo } from "@/components/ui/Logo";
import { GuideCard } from "@/components/guide/GuideCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllGuides } from "@/lib/guide/loader";
import { GUIDE_CATEGORIES } from "@/lib/guide/types";

export const revalidate = 86400;

export const metadata = buildMetadata({
  path: "/guide",
  title: "Guide",
  description:
    "Rolige, grundige guider om CV, søknadsbrev, intervju, karriereskifte og lønnsforhandling. Skrevet for å hjelpe deg videre, ikke stresse deg.",
});

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function GuideHubPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const all = await getAllGuides();
  const activeTag = tag && GUIDE_CATEGORIES.some((c) => c === tag) ? tag : null;
  const guides = activeTag
    ? all.filter((g) => g.frontmatter.tags?.includes(activeTag as never))
    : all;

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "Søknadsbasen", path: "/" },
          { name: "Guide", path: "/guide" },
        ])}
      />

      <header className="max-w-[1100px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#14110e]/65 hover:text-[#14110e]"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          Tilbake
        </Link>
      </header>

      <main className="max-w-[820px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs
            items={[
              { name: "Søknadsbasen", path: "/" },
              { name: "Guide", path: "/guide" },
            ]}
          />
        </div>

        <section aria-labelledby="guide-hub-heading" className="mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#c15a3a] mb-4">
            Guide
          </div>
          <h1
            id="guide-hub-heading"
            className="text-[40px] md:text-[64px] leading-[1.02] tracking-[-0.035em] font-medium mb-5"
          >
            Jobbsøking, forklart.
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.6] text-[#14110e]/70 max-w-[60ch]">
            Grundige guider om CV, søknadsbrev, intervju, karriereskifte og
            lønnsforhandling. Skrevet for å hjelpe deg videre, uten stress, uten
            fyllstoff.
          </p>
        </section>

        <nav
          aria-label="Filtrer etter kategori"
          className="mb-10 flex flex-wrap gap-2"
        >
          <TagChip href="/guide" active={!activeTag}>
            Alle
          </TagChip>
          {GUIDE_CATEGORIES.map((cat) => (
            <TagChip
              key={cat}
              href={`/guide?tag=${encodeURIComponent(cat)}`}
              active={activeTag === cat}
            >
              {cat}
            </TagChip>
          ))}
        </nav>

        {guides.length === 0 ? (
          <EmptyState hasFilter={!!activeTag} />
        ) : (
          <section aria-label="Guider">
            {guides.map((g) => (
              <GuideCard key={g.frontmatter.slug} guide={g} />
            ))}
            <div className="border-t border-black/10" />
          </section>
        )}
      </main>

      <footer className="border-t border-black/10">
        <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-8 flex flex-wrap items-center justify-between text-[12px] text-[#14110e]/55 gap-4">
          <span>© 2026 Søknadsbasen</span>
          <span className="flex items-center gap-3">
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

function TagChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "px-4 py-1.5 rounded-full text-[12px] bg-[#14110e] text-[#faf8f5]"
          : "px-4 py-1.5 rounded-full text-[12px] bg-black/5 text-[#14110e]/70 hover:bg-black/10 hover:text-[#14110e] transition-colors"
      }
    >
      {children}
    </Link>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="border-t border-b border-black/10 py-16 text-center">
      <p className="text-[15px] text-[#14110e]/70 mb-2">
        {hasFilter
          ? "Ingen guider i denne kategorien enda."
          : "Første guider publiseres snart."}
      </p>
      <p className="text-[13px] text-[#14110e]/55">
        Vi skriver heller færre, bedre guider, ikke et bibliotek med fyllstoff.
      </p>
    </div>
  );
}
