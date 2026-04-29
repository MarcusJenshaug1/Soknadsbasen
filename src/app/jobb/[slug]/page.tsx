import type { ReactNode } from "react";
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

type WorkLocation = {
  city: string | null;
  county: string | null;
  country: string | null;
  postalCode: string | null;
  municipal: string | null;
};

type CategoryEntry = {
  code: string | null;
  categoryType: string | null;
  name: string | null;
};

function asWorkLocations(value: unknown): WorkLocation[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is WorkLocation => typeof v === "object" && v !== null,
  );
}

function asCategoryList(value: unknown): CategoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is CategoryEntry => typeof v === "object" && v !== null,
  );
}

function formatLocationLine(loc: WorkLocation): string {
  const parts = [
    loc.postalCode,
    loc.city ?? loc.municipal,
    loc.county,
    loc.country && loc.country.toUpperCase() !== "NORGE" ? loc.country : null,
  ].filter((p): p is string => Boolean(p));
  return parts.join(", ");
}

function jobPostingJsonLd(job: {
  title: string;
  description: string;
  publishedAt: Date;
  expiresAt: Date | null;
  applicationDueAt: Date | null;
  employerName: string;
  employerOrgnr: string | null;
  employerHomepage: string | null;
  employerDescription: string | null;
  location: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  workLocations: WorkLocation[];
  applyUrl: string | null;
  sourceUrl: string | null;
  employmentType: string | null;
  engagementType: string | null;
  extent: string | null;
  positionCount: number | null;
  sector: string | null;
  category: string | null;
  categoryList: CategoryEntry[];
  slug: string;
}): JsonLd {
  const validThrough = job.applicationDueAt ?? job.expiresAt;
  const occupationalCategory = job.categoryList
    .map((c) => c.name)
    .filter((n): n is string => Boolean(n))
    .join(", ");

  const buildAddress = (loc: WorkLocation | null) => ({
    "@type": "PostalAddress" as const,
    addressLocality: loc?.city ?? loc?.municipal ?? job.location ?? "Norge",
    addressRegion: loc?.county ?? job.region ?? undefined,
    postalCode: loc?.postalCode ?? job.postalCode ?? undefined,
    addressCountry:
      (loc?.country && loc.country.length === 2
        ? loc.country.toUpperCase()
        : null) ?? "NO",
  });

  const jobLocation =
    job.workLocations.length > 0
      ? job.workLocations.map((loc) => ({
          "@type": "Place" as const,
          address: buildAddress(loc),
        }))
      : [
          {
            "@type": "Place" as const,
            address: buildAddress(null),
          },
        ];

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description.slice(0, 5000),
    datePosted: job.publishedAt.toISOString(),
    ...(validThrough ? { validThrough: validThrough.toISOString() } : {}),
    employmentType: job.employmentType ?? "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.employerName,
      ...(job.employerHomepage ? { sameAs: job.employerHomepage } : {}),
      ...(job.employerOrgnr
        ? {
            identifier: {
              "@type": "PropertyValue",
              name: "orgnr",
              value: job.employerOrgnr,
            },
          }
        : {}),
      ...(job.employerDescription
        ? { description: job.employerDescription.slice(0, 2000) }
        : {}),
    },
    jobLocation: jobLocation.length === 1 ? jobLocation[0] : jobLocation,
    ...(occupationalCategory
      ? { occupationalCategory }
      : job.category
        ? { occupationalCategory: job.category }
        : {}),
    ...(typeof job.positionCount === "number" && job.positionCount > 0
      ? { totalJobOpenings: job.positionCount }
      : {}),
    ...(job.sector ? { industry: job.sector } : {}),
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

  const workLocations = asWorkLocations(job.workLocations);
  const categoryList = asCategoryList(job.categoryList);
  const occupationList = asCategoryList(job.occupationList);

  const jsonLd: JsonLd[] = [
    breadcrumbJsonLd(breadcrumbs),
    jobPostingJsonLd({
      title: job.title,
      description: job.description,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      applicationDueAt: job.applicationDueAt,
      employerName: job.employerName,
      employerOrgnr: job.employerOrgnr,
      employerHomepage: job.employerHomepage,
      employerDescription: job.employerDescription,
      location: job.location,
      region: job.region,
      postalCode: job.postalCode,
      country: job.country,
      workLocations,
      applyUrl: job.applyUrl,
      sourceUrl: job.sourceUrl,
      employmentType: job.employmentType,
      engagementType: job.engagementType,
      extent: job.extent,
      positionCount: job.positionCount,
      sector: job.sector,
      category: job.category,
      categoryList,
      slug: job.slug,
    }),
  ];

  // applicationDueAt er den autoritative søknadsfristen. expiresAt brukes som
  // fallback når NAV ikke har eksplisitt frist (f.eks. løpende rekruttering).
  const dueAt = job.applicationDueAt ?? job.expiresAt;
  const daysToExpiry = dueAt
    ? Math.floor((dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const tagSet = new Set<string>();
  if (job.category) tagSet.add(job.category);
  if (job.occupation && job.occupation !== job.category) tagSet.add(job.occupation);
  for (const c of categoryList) {
    if (c.name) tagSet.add(c.name);
  }
  for (const o of occupationList) {
    if (o.name) tagSet.add(o.name);
  }
  const tags = Array.from(tagSet);

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
              {typeof job.positionCount === "number" && job.positionCount > 1 && (
                <>
                  <span className="text-[#14110e]/30">·</span>
                  <span>{job.positionCount} stillinger</span>
                </>
              )}
              {job.sector && (
                <>
                  <span className="text-[#14110e]/30">·</span>
                  <span>{job.sector}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex px-3 py-1 rounded-full text-[11px] bg-[#eee9df] text-[#14110e]/70"
                >
                  {tag}
                </span>
              ))}
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

          <FactsPanel
            engagementType={job.engagementType}
            extent={job.extent}
            employmentType={job.employmentType}
            sector={job.sector}
            positionCount={job.positionCount}
            workLocations={workLocations}
            location={job.location}
            region={job.region}
            postalCode={job.postalCode}
            applicationDueAt={job.applicationDueAt}
            expiresAt={job.expiresAt}
            publishedAt={job.publishedAt}
            sourceUpdatedAt={job.sourceUpdatedAt}
            sourceUrl={job.sourceUrl}
            applyUrl={job.applyUrl}
          />

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

          {(job.employerDescription || job.employerHomepage || job.employerOrgnr) && (
            <EmployerPanel
              name={job.employerName}
              description={job.employerDescription}
              homepage={job.employerHomepage}
              orgnr={job.employerOrgnr}
            />
          )}

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

const DATE_FORMAT = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return DATE_FORMAT.format(d);
}

function FactsPanel({
  engagementType,
  extent,
  employmentType,
  sector,
  positionCount,
  workLocations,
  location,
  region,
  postalCode,
  applicationDueAt,
  expiresAt,
  publishedAt,
  sourceUpdatedAt,
  sourceUrl,
  applyUrl,
}: {
  engagementType: string | null;
  extent: string | null;
  employmentType: string | null;
  sector: string | null;
  positionCount: number | null;
  workLocations: WorkLocation[];
  location: string | null;
  region: string | null;
  postalCode: string | null;
  applicationDueAt: Date | null;
  expiresAt: Date | null;
  publishedAt: Date;
  sourceUpdatedAt: Date | null;
  sourceUrl: string | null;
  applyUrl: string | null;
}) {
  const facts: Array<{ label: string; value: ReactNode }> = [];

  if (engagementType || extent || employmentType) {
    const parts = [engagementType, extent].filter((p): p is string => Boolean(p));
    facts.push({
      label: "Ansettelsesform",
      value: parts.length > 0 ? parts.join(" · ") : employmentType,
    });
  }
  if (sector) {
    facts.push({ label: "Sektor", value: sector });
  }
  if (typeof positionCount === "number" && positionCount > 0) {
    facts.push({
      label: "Antall stillinger",
      value: positionCount.toString(),
    });
  }

  const locationLines =
    workLocations.length > 0
      ? workLocations.map(formatLocationLine).filter((l) => l.length > 0)
      : [
          [postalCode, location ?? region]
            .filter((p): p is string => Boolean(p))
            .join(", "),
        ].filter((l) => l.length > 0);
  if (locationLines.length > 0) {
    facts.push({
      label: locationLines.length > 1 ? "Arbeidssteder" : "Arbeidssted",
      value: (
        <ul className="space-y-0.5">
          {locationLines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ),
    });
  }

  if (applicationDueAt) {
    facts.push({ label: "Søknadsfrist", value: formatDate(applicationDueAt) });
  } else if (expiresAt) {
    facts.push({ label: "Søknadsfrist", value: formatDate(expiresAt) });
  }
  facts.push({ label: "Publisert", value: formatDate(publishedAt) });
  if (
    sourceUpdatedAt &&
    Math.abs(sourceUpdatedAt.getTime() - publishedAt.getTime()) > 24 * 60 * 60 * 1000
  ) {
    facts.push({ label: "Sist oppdatert", value: formatDate(sourceUpdatedAt) });
  }

  const externalLink = sourceUrl && sourceUrl !== applyUrl ? sourceUrl : null;

  if (facts.length === 0 && !externalLink) return null;

  return (
    <section
      aria-label="Stillingsfakta"
      className="mt-8 rounded-2xl border border-black/10 bg-white p-6"
    >
      <h2 className="text-[14px] font-medium tracking-tight mb-4 text-[#14110e]/55 uppercase">
        Om stillingen
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-[14px]">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[12px] text-[#14110e]/55 mb-1">{f.label}</dt>
            <dd className="text-[#14110e]">{f.value}</dd>
          </div>
        ))}
      </dl>
      {externalLink && (
        <div className="mt-5 pt-4 border-t border-black/5 text-[13px]">
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#14110e]/70 hover:text-[#D5592E] transition-colors"
          >
            Se annonsen hos arbeidsgiver →
          </a>
        </div>
      )}
    </section>
  );
}

function EmployerPanel({
  name,
  description,
  homepage,
  orgnr,
}: {
  name: string;
  description: string | null;
  homepage: string | null;
  orgnr: string | null;
}) {
  return (
    <section
      aria-label={`Om ${name}`}
      className="mt-2 mb-8 rounded-2xl border border-black/10 bg-white p-6"
    >
      <h2 className="text-[14px] font-medium tracking-tight mb-4 text-[#14110e]/55 uppercase">
        Om arbeidsgiver
      </h2>
      <h3 className="text-[18px] font-medium mb-2">{name}</h3>
      {description && (
        <div className="text-[14px] leading-[1.65] text-[#14110e]/80 mb-4">
          {description.split("\n\n").map((p, i) => (
            <p key={i} className="mb-2 last:mb-0">
              {p}
            </p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#14110e]/60">
        {homepage && (
          <a
            href={homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#D5592E] transition-colors"
          >
            {homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")} →
          </a>
        )}
        {orgnr && <span>Org.nr {orgnr}</span>}
      </div>
    </section>
  );
}
