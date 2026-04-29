import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, type JsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { prisma } from "@/lib/prisma";
import { HeaderCTA } from "../../LandingCTAs";

export const revalidate = 1800;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const job = await prisma.job.findUnique({
    where: { slug },
    select: {
      title: true,
      employerName: true,
      location: true,
      description: true,
      isActive: true,
    },
  });
  if (!job) return buildMetadata({ path: `/jobb/${slug}`, noindex: true });

  const description = job.description.slice(0, 155).replace(/\s+/g, " ");
  return buildMetadata({
    path: `/jobb/${slug}`,
    title: `${job.title} hos ${job.employerName}${job.location ? ` (${job.location})` : ""}`,
    description: description.length > 50 ? description : `${job.title} hos ${job.employerName}.${job.location ? ` ${job.location}.` : ""} Stilling fra Arbeidsplassen.no.`,
    noindex: !job.isActive,
  });
}

function jobPostingJsonLd(job: {
  title: string;
  description: string;
  publishedAt: Date;
  expiresAt: Date | null;
  employerName: string;
  location: string | null;
  region: string | null;
  applyUrl: string | null;
  employmentType: string | null;
  category: string | null;
  slug: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description.slice(0, 5000),
    datePosted: job.publishedAt.toISOString(),
    ...(job.expiresAt ? { validThrough: job.expiresAt.toISOString() } : {}),
    employmentType: job.employmentType ?? "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.employerName,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location ?? job.region ?? "Norge",
        addressRegion: job.region ?? undefined,
        addressCountry: "NO",
      },
    },
    ...(job.category ? { occupationalCategory: job.category } : {}),
    url: absoluteUrl(`/jobb/${job.slug}`),
    ...(job.applyUrl
      ? {
          directApply: false,
          applicationContact: {
            "@type": "ContactPoint",
            url: job.applyUrl,
          },
        }
      : {}),
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const job = await prisma.job.findUnique({ where: { slug } });
  if (!job) notFound();

  const breadcrumbs = [
    { name: "Søknadsbasen", path: "/" },
    { name: "Stillinger", path: "/jobb" },
    { name: job.title, path: `/jobb/${job.slug}` },
  ];

  const jsonLd: JsonLd[] = [
    breadcrumbJsonLd(breadcrumbs),
    jobPostingJsonLd(job),
  ];

  const daysToExpiry = job.expiresAt
    ? Math.floor((job.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Related: same category, latest 4
  const related = job.category
    ? await prisma.job.findMany({
        where: {
          isActive: true,
          category: job.category,
          slug: { not: job.slug },
        },
        select: { slug: true, title: true, employerName: true, location: true },
        orderBy: { publishedAt: "desc" },
        take: 4,
      })
    : [];

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
          <Link href="/jobb" className="text-[#14110e]">
            Stillinger
          </Link>
          <Link href="/guide" className="hover:text-[#14110e]">
            Guide
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <HeaderCTA />
        </div>
      </header>

      <main className="max-w-[820px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-8">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <article>
          <header className="pb-8 border-b border-black/10">
            <h1 className="text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] font-medium mb-4">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-[#14110e]/75 mb-5">
              <span className="font-medium text-[#14110e]">{job.employerName}</span>
              {job.location && (
                <>
                  <span className="text-[#14110e]/30">·</span>
                  <span>{job.location}</span>
                </>
              )}
              {job.employmentType && (
                <>
                  <span className="text-[#14110e]/30">·</span>
                  <span>{job.employmentType}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {job.category && (
                <span className="inline-flex px-3 py-1 rounded-full text-[11px] bg-[#eee9df] text-[#14110e]/70">
                  {job.category}
                </span>
              )}
              {job.occupation && job.occupation !== job.category && (
                <span className="inline-flex px-3 py-1 rounded-full text-[11px] bg-[#eee9df] text-[#14110e]/70">
                  {job.occupation}
                </span>
              )}
              {daysToExpiry !== null && daysToExpiry >= 0 && (
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-[11px] ${daysToExpiry <= 3 ? "bg-[#D5592E]/10 text-[#D5592E]" : "bg-emerald-50 text-emerald-800"}`}
                >
                  {daysToExpiry === 0
                    ? "Frist i dag"
                    : daysToExpiry === 1
                      ? "Frist i morgen"
                      : `${daysToExpiry} dager til frist`}
                </span>
              )}
              {!job.isActive && (
                <span className="inline-flex px-3 py-1 rounded-full text-[11px] bg-black/10 text-[#14110e]/55">
                  Ikke aktiv lenger
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/registrer?next=${encodeURIComponent(`/app/pipeline?job=${job.slug}`)}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium hover:bg-[#a94424] transition-colors"
              >
                Lag søknad i Søknadsbasen
              </Link>
              {job.applyUrl && (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-black/15 text-[14px] hover:border-[#14110e]/30 hover:bg-black/5 transition-colors"
                >
                  Søk via {job.employerName} →
                </a>
              )}
            </div>
          </header>

          <section
            aria-label="Stillingsbeskrivelse"
            className="py-10 prose prose-sm md:prose-base max-w-none text-[#14110e]/85"
          >
            {job.description.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-4 leading-[1.7] text-[15px] md:text-[16px]">
                {paragraph}
              </p>
            ))}
          </section>

          <aside className="rounded-2xl border border-black/10 bg-white p-6 mb-8">
            <h2 className="text-[16px] font-medium mb-3">
              Med Søknadsbasen får du
            </h2>
            <ul className="space-y-2 text-[13px] text-[#14110e]/75">
              <li className="flex gap-2">
                <span className="text-[#D5592E]">+</span>
                <span>
                  AI-søknadsbrev som speiler språket i denne annonsen, med norsk
                  konvensjon (maks 350 ord, ingen amerikanske klisjéer)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D5592E]">+</span>
                <span>
                  CV-bygger med 8 maler og ATS-vennlig PDF-eksport som leses
                  korrekt av Webcruiter, ReachMee og andre rekrutterings-systemer
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D5592E]">+</span>
                <span>
                  Match Score som viser hvor godt CV-en din dekker kravene i
                  denne stillingen, gratis
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D5592E]">+</span>
                <span>
                  Pipeline med kanban og frister, slik at du holder oversikt
                  over alle parallelle søknader
                </span>
              </li>
            </ul>
          </aside>
        </article>

        {related.length > 0 && (
          <section
            aria-label="Liknende stillinger"
            className="border-t border-black/10 pt-10"
          >
            <h2 className="text-[20px] md:text-[24px] font-medium mb-5">
              Liknende stillinger
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/jobb/${r.slug}`}
                    className="block rounded-2xl border border-black/10 bg-white hover:border-[#14110e]/30 hover:bg-[#eee9df]/40 transition-colors px-5 py-4"
                  >
                    <div className="text-[14px] font-medium tracking-tight mb-1">
                      {r.title}
                    </div>
                    <div className="text-[12px] text-[#14110e]/65">
                      {r.employerName}
                      {r.location ? ` · ${r.location}` : ""}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
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
            <Link href="/personvern-og-data" className="hover:text-[#14110e]">
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
