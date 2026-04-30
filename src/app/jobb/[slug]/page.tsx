import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  Clock,
  ExternalLink,
  FileSearch,
  Globe,
  Hash,
  Home,
  Languages,
  Mail,
  MapPin,
  Phone,
  Sun,
  User2,
  Users,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, type JsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { displayPlace } from "@/lib/jobs/format";
import { HeaderCTA } from "../../LandingCTAs";
import { JobActions } from "./JobActions";

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
  address: string | null;
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
  const cityPart = displayPlace(loc.city ?? loc.municipal ?? null) || null;
  const cityWithPostal =
    [loc.postalCode, cityPart].filter((p): p is string => Boolean(p)).join(" ") ||
    null;
  const parts = [
    loc.address,
    cityWithPostal,
    displayPlace(loc.county ?? null) || null,
    loc.country && loc.country.toUpperCase() !== "NORGE"
      ? displayPlace(loc.country)
      : null,
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
  const [job, session] = await Promise.all([
    prisma.job.findUnique({ where: { slug } }),
    getSession(),
  ]);
  if (!job) notFound();

  const savedApplication = session
    ? await prisma.jobApplication.findFirst({
        where: {
          userId: session.userId,
          OR: [
            { jobUrl: absoluteUrl(`/jobb/${slug}`) },
            { jobUrl: `/jobb/${slug}` },
          ],
        },
        select: { id: true },
      })
    : null;

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

  // Related: prøv kategori → arbeidsgiver → region. Faller tilbake slik at
  // vi alltid har 4 relaterte selv om kategori-dataen mangler.
  const relatedWhereChain: Array<Record<string, unknown>> = [];
  if (job.category) relatedWhereChain.push({ category: job.category });
  if (job.employerSlug) relatedWhereChain.push({ employerSlug: job.employerSlug });
  if (job.region) relatedWhereChain.push({ region: job.region });

  let related: Array<{
    slug: string;
    title: string;
    employerName: string;
    location: string | null;
  }> = [];
  for (const filter of relatedWhereChain) {
    if (related.length >= 4) break;
    const existingSlugs = new Set(related.map((r) => r.slug));
    const more = await prisma.job.findMany({
      where: {
        isActive: true,
        ...filter,
        slug: { not: job.slug, notIn: Array.from(existingSlugs) },
      },
      select: { slug: true, title: true, employerName: true, location: true },
      orderBy: { publishedAt: "desc" },
      take: 4 - related.length,
    });
    related = [...related, ...more];
  }

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
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {daysToExpiry !== null && daysToExpiry >= 0 && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium ${daysToExpiry <= 3 ? "bg-[#D5592E]/10 text-[#D5592E]" : "bg-emerald-50 text-emerald-800"}`}
                >
                  <CalendarClock className="size-3.5" aria-hidden />
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

            <h1 className="text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.025em] font-medium mb-4">
              {job.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[#14110e]/75 mb-6">
              <span className="inline-flex items-center gap-2 font-medium text-[#14110e]">
                <Building2 className="size-4 text-[#14110e]/45" aria-hidden />
                {job.employerName}
              </span>
              {job.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-[#14110e]/45" aria-hidden />
                  {displayPlace(job.location)}
                </span>
              )}
              {(job.engagementType || job.extent || job.employmentType) && (
                <span className="inline-flex items-center gap-2">
                  <Briefcase className="size-4 text-[#14110e]/45" aria-hidden />
                  {[job.engagementType, job.extent].filter(Boolean).join(" · ") ||
                    job.employmentType}
                </span>
              )}
              {typeof job.positionCount === "number" && job.positionCount > 1 && (
                <span className="inline-flex items-center gap-2">
                  <Users className="size-4 text-[#14110e]/45" aria-hidden />
                  {job.positionCount} stillinger
                </span>
              )}
              {job.sector && (
                <span className="inline-flex items-center gap-2">
                  <Hash className="size-4 text-[#14110e]/45" aria-hidden />
                  {job.sector}
                </span>
              )}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex px-3 py-1 rounded-full text-[11px] bg-[#eee9df] text-[#14110e]/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <JobActions
              slug={job.slug}
              isLoggedIn={Boolean(session)}
              initialSavedId={savedApplication?.id ?? null}
              applyUrl={job.applyUrl}
              employerName={job.employerName}
            />
          </header>

          <FactsPanel
            jobTitle={job.jobTitle}
            engagementType={job.engagementType}
            extent={job.extent}
            employmentType={job.employmentType}
            sector={job.sector}
            positionCount={job.positionCount}
            workhours={job.workhours}
            workdays={job.workdays}
            starttime={job.starttime}
            remote={job.remote}
            workLanguages={job.workLanguages}
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

          {(job.contactName || job.contactEmail || job.contactPhone) && (
            <ContactPanel
              name={job.contactName}
              title={job.contactTitle}
              email={job.contactEmail}
              phone={job.contactPhone}
            />
          )}

          {job.description.trim().length > 0 ? (
            <section
              aria-label="Stillingsbeskrivelse"
              className="py-10 prose prose-sm md:prose-base max-w-none text-[#14110e]/85 prose-headings:text-ink prose-strong:text-ink prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: renderDescription(job.description) }}
            />
          ) : (
            <DescriptionFallback
              applyUrl={job.applyUrl}
              sourceUrl={job.sourceUrl}
              employerName={job.employerName}
            />
          )}

          {(job.employerDescription || job.employerHomepage || job.employerOrgnr) && (
            <EmployerPanel
              name={job.employerName}
              description={job.employerDescription}
              homepage={job.employerHomepage}
              orgnr={job.employerOrgnr}
            />
          )}

          <SourceMetaPanel
            externalId={job.externalId}
            source={job.source}
            sourceUpdatedAt={job.sourceUpdatedAt}
            sourceUrl={job.sourceUrl}
            applyUrl={job.applyUrl}
          />

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
                      {r.location ? ` · ${displayPlace(r.location)}` : ""}
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

/**
 * NAV leverer description som HTML (sanitized i sync). Eldre rader fra før
 * sanitizer-fixen ligger lagret som plain text med \n\n-paragrafer. Detect
 * HTML og rendre rett gjennom, ellers wrap plain text i <p>-tags.
 */
function renderDescription(input: string): string {
  if (/<(p|h[1-6]|ul|ol|li|strong|em|br|a)\b/i.test(input)) {
    return input;
  }
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return DATE_FORMAT.format(d);
}

type LucideIcon = typeof Briefcase;

function FactsPanel({
  jobTitle,
  engagementType,
  extent,
  employmentType,
  sector,
  positionCount,
  workhours,
  workdays,
  starttime,
  remote,
  workLanguages,
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
  jobTitle: string | null;
  engagementType: string | null;
  extent: string | null;
  employmentType: string | null;
  sector: string | null;
  positionCount: number | null;
  workhours: string | null;
  workdays: string | null;
  starttime: string | null;
  remote: string | null;
  workLanguages: string[];
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
  const facts: Array<{ icon: LucideIcon; label: string; value: ReactNode }> = [];

  if (jobTitle) {
    facts.push({ icon: Briefcase, label: "Stillingstittel", value: jobTitle });
  }
  if (engagementType || extent || employmentType) {
    const parts = [engagementType, extent].filter((p): p is string => Boolean(p));
    facts.push({
      icon: Briefcase,
      label: "Ansettelsesform",
      value: parts.length > 0 ? parts.join(" · ") : employmentType,
    });
  }
  if (sector) {
    facts.push({ icon: Hash, label: "Sektor", value: sector });
  }
  if (typeof positionCount === "number" && positionCount > 0) {
    facts.push({
      icon: Users,
      label: "Antall stillinger",
      value: positionCount.toString(),
    });
  }
  if (workhours || workdays) {
    facts.push({
      icon: Sun,
      label: "Arbeidstid",
      value: [workhours, workdays].filter(Boolean).join(" · "),
    });
  }
  if (starttime) {
    facts.push({ icon: Clock, label: "Oppstart", value: starttime });
  }
  if (remote) {
    facts.push({ icon: Home, label: "Hjemmekontor", value: remote });
  }
  if (workLanguages.length > 0) {
    facts.push({
      icon: Languages,
      label: "Arbeidsspråk",
      value: workLanguages.join(", "),
    });
  }

  const fallbackPlace = displayPlace(location ?? region);
  const locationLines =
    workLocations.length > 0
      ? workLocations.map(formatLocationLine).filter((l) => l.length > 0)
      : [
          [postalCode, fallbackPlace || null]
            .filter((p): p is string => Boolean(p))
            .join(", "),
        ].filter((l) => l.length > 0);
  if (locationLines.length > 0) {
    facts.push({
      icon: MapPin,
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
    facts.push({
      icon: CalendarClock,
      label: "Søknadsfrist",
      value: formatDate(applicationDueAt),
    });
  } else if (expiresAt) {
    facts.push({
      icon: CalendarClock,
      label: "Søknadsfrist",
      value: formatDate(expiresAt),
    });
  }
  facts.push({ icon: Calendar, label: "Publisert", value: formatDate(publishedAt) });
  if (
    sourceUpdatedAt &&
    Math.abs(sourceUpdatedAt.getTime() - publishedAt.getTime()) > 24 * 60 * 60 * 1000
  ) {
    facts.push({
      icon: Clock,
      label: "Sist oppdatert",
      value: formatDate(sourceUpdatedAt),
    });
  }

  const externalLink = sourceUrl && sourceUrl !== applyUrl ? sourceUrl : null;

  if (facts.length === 0 && !externalLink) return null;

  return (
    <section
      aria-label="Stillingsfakta"
      className="mt-8 rounded-2xl border border-black/10 bg-white p-6 md:p-7"
    >
      <h2 className="text-[14px] font-medium tracking-tight mb-5 text-[#14110e]/55 uppercase">
        Om stillingen
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-[14px]">
        {facts.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="flex gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eee9df]">
                <Icon className="size-4 text-[#14110e]/65" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-[#14110e]/50 mb-0.5">
                  {f.label}
                </dt>
                <dd className="text-[14px] text-[#14110e] leading-snug">{f.value}</dd>
              </div>
            </div>
          );
        })}
      </dl>
      {externalLink && (
        <div className="mt-6 pt-5 border-t border-black/5 text-[13px]">
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#14110e]/70 hover:text-[#D5592E] transition-colors"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Se annonsen hos arbeidsgiver
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
  const cleanHomepage = homepage
    ? homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  return (
    <section
      aria-label={`Om ${name}`}
      className="mt-2 mb-8 rounded-2xl border border-black/10 bg-white p-6 md:p-7"
    >
      <h2 className="text-[14px] font-medium tracking-tight mb-5 text-[#14110e]/55 uppercase">
        Om arbeidsgiver
      </h2>
      <div className="flex items-start gap-4 mb-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eee9df]">
          <Building2 className="size-6 text-[#14110e]/65" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[18px] md:text-[20px] font-medium tracking-tight mb-1">
            {name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#14110e]/60">
            {cleanHomepage && (
              <a
                href={homepage!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#D5592E] transition-colors"
              >
                <Globe className="size-3.5" aria-hidden />
                {cleanHomepage}
              </a>
            )}
            {orgnr && (
              <span className="inline-flex items-center gap-1.5">
                <Hash className="size-3.5" aria-hidden />
                Org.nr {orgnr}
              </span>
            )}
          </div>
        </div>
      </div>
      {description && (
        <div
          className="prose prose-sm max-w-none text-[14px] leading-[1.65] text-[#14110e]/80 prose-headings:text-ink prose-strong:text-ink prose-a:text-accent prose-li:my-0.5"
          dangerouslySetInnerHTML={{ __html: renderDescription(description) }}
        />
      )}
    </section>
  );
}

function ContactPanel({
  name,
  title,
  email,
  phone,
}: {
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
}) {
  return (
    <section
      aria-label="Kontaktperson"
      className="mt-2 mb-8 rounded-2xl border border-black/10 bg-white p-6 md:p-7"
    >
      <h2 className="text-[14px] font-medium tracking-tight mb-5 text-[#14110e]/55 uppercase">
        Kontaktperson for stillingen
      </h2>
      <div className="flex items-start gap-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eee9df]">
          <User2 className="size-5 text-[#14110e]/65" aria-hidden />
        </span>
        <div className="min-w-0">
          {name && (
            <h3 className="text-[16px] font-medium tracking-tight">{name}</h3>
          )}
          {title && (
            <p className="text-[13px] text-[#14110e]/65 mb-2">{title}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-[#14110e]/75 hover:text-[#D5592E]"
              >
                <Mail className="size-3.5" aria-hidden />
                {email}
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 text-[#14110e]/75 hover:text-[#D5592E]"
              >
                <Phone className="size-3.5" aria-hidden />
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DescriptionFallback({
  applyUrl,
  sourceUrl,
  employerName,
}: {
  applyUrl: string | null;
  sourceUrl: string | null;
  employerName: string;
}) {
  const link = sourceUrl ?? applyUrl;
  return (
    <section
      aria-label="Stillingsbeskrivelse"
      className="my-10 rounded-2xl border border-dashed border-black/15 bg-[#eee9df]/40 p-6 md:p-8 text-center"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-white border border-black/10 mb-3">
        <FileSearch className="size-5 text-[#14110e]/55" aria-hidden />
      </span>
      <h2 className="text-[16px] md:text-[18px] font-medium mb-2">
        Full beskrivelse mangler i sammendraget
      </h2>
      <p className="text-[13px] text-[#14110e]/70 max-w-[460px] mx-auto mb-4">
        Vi henter stillingen automatisk fra Arbeidsplassen.no. Den fullstendige
        annonseteksten ligger hos {employerName}.
      </p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#D5592E] hover:underline"
        >
          Les hele annonsen
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </section>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  arbeidsplassen: "Arbeidsplassen.no",
};

function SourceMetaPanel({
  externalId,
  source,
  sourceUpdatedAt,
  sourceUrl,
  applyUrl,
}: {
  externalId: string;
  source: string;
  sourceUpdatedAt: Date | null;
  sourceUrl: string | null;
  applyUrl: string | null;
}) {
  const sourceLabel = SOURCE_LABELS[source] ?? source;
  const externalLink = sourceUrl && sourceUrl !== applyUrl ? sourceUrl : null;

  return (
    <section
      aria-label="Annonsedata"
      className="mt-2 mb-8 rounded-2xl border border-black/10 bg-white p-6 md:p-7"
    >
      <h2 className="text-[14px] font-medium tracking-tight mb-5 text-[#14110e]/55 uppercase">
        Annonsedata
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 text-[13px]">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-[#14110e]/50 mb-0.5">
            Hentet fra
          </dt>
          <dd className="text-[#14110e]">{sourceLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-[#14110e]/50 mb-0.5">
            Stillingsnummer
          </dt>
          <dd className="text-[#14110e] font-mono text-[12px] break-all">
            {externalId}
          </dd>
        </div>
        {sourceUpdatedAt && (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-[#14110e]/50 mb-0.5">
              Sist endret
            </dt>
            <dd className="text-[#14110e]">{formatDate(sourceUpdatedAt)}</dd>
          </div>
        )}
      </dl>
      {externalLink && (
        <div className="mt-5 pt-4 border-t border-black/5 text-[13px]">
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#14110e]/70 hover:text-[#D5592E] transition-colors"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Se original annonse hos arbeidsgiver
          </a>
        </div>
      )}
    </section>
  );
}
