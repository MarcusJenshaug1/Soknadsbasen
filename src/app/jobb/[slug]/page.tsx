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
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { breadcrumbJsonLd, type JsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getJobBySlug } from "@/lib/jobs/get-job";
import { displayPlace, formatCategory, formatPhones } from "@/lib/jobs/format";
import { JobActions } from "./JobActions";
import { JobAtsCard } from "./JobAtsCard";

export const revalidate = 1800;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return buildMetadata({ path: `/jobb/${slug}`, noindex: true });

  // job.description er HTML etter sanitizer-fixen — strip tags for meta-tekst.
  const plain = job.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const description = plain.slice(0, 155);
  const title = `${job.title} hos ${job.employerName}${job.location ? ` (${job.location})` : ""}`;
  return buildMetadata({
    path: `/jobb/${slug}`,
    title,
    description: description.length > 50 ? description : `${job.title} hos ${job.employerName}.${job.location ? ` ${job.location}.` : ""} Stilling fra Arbeidsplassen.no.`,
    ogImage: `/jobb/${slug}/opengraph-image`,
    ogImageAlt: title,
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

  // Cachet helper: generateMetadata og denne page-bodyen deler én rundtur.
  const job = await getJobBySlug(slug);
  if (!job) notFound();

  // Bygg OR-filter for relaterte før Promise.all så vi kan starte spørringen
  // i parallell med session/saved.
  const orFilters: Array<Record<string, string>> = [];
  if (job.category) orFilters.push({ category: job.category });
  if (job.employerSlug) orFilters.push({ employerSlug: job.employerSlug });
  if (job.region) orFilters.push({ region: job.region });

  const [session, candidates] = await Promise.all([
    getSession(),
    orFilters.length === 0
      ? Promise.resolve(
          [] as Array<{
            slug: string;
            title: string;
            employerName: string;
            location: string | null;
            category: string | null;
            employerSlug: string;
            region: string | null;
            publishedAt: Date;
          }>,
        )
      : prisma.job.findMany({
          where: {
            isActive: true,
            slug: { not: job.slug },
            OR: orFilters,
          },
          select: {
            slug: true,
            title: true,
            employerName: true,
            location: true,
            category: true,
            employerSlug: true,
            region: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: "desc" },
          take: 12,
        }),
  ]);

  // Saved-state krever userId og kan ikke parallelliseres med session selv.
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

  // Rangér relaterte: kategori-match veier mest, deretter arbeidsgiver, så region.
  const related = candidates
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      employerName: r.employerName,
      location: r.location,
      score:
        (r.category === job.category ? 4 : 0) +
        (r.employerSlug === job.employerSlug ? 2 : 0) +
        (r.region === job.region ? 1 : 0),
      publishedAt: r.publishedAt,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.publishedAt.getTime() - a.publishedAt.getTime(),
    )
    .slice(0, 4);

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

  return (
    <>
      <JsonLdScript data={jsonLd} />

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
                    {formatCategory(tag)}
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

            {session && (
              <div className="mt-6">
                <JobAtsCard
                  applicationId={savedApplication?.id ?? null}
                  jobDescription={job.description}
                />
              </div>
            )}
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
            <section aria-labelledby="stillingsbeskrivelse" className="py-10">
              <h2
                id="stillingsbeskrivelse"
                className="text-[22px] md:text-[26px] font-semibold tracking-[-0.01em] text-ink mb-6"
              >
                Stillingsbeskrivelse
              </h2>
              <div
                className="prose prose-sm md:prose-base max-w-none text-[#14110e]/85 prose-p:my-4 prose-p:leading-[1.7] prose-headings:text-ink prose-headings:font-semibold prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-[18px] md:prose-h3:text-[20px] prose-strong:text-ink prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-ul:my-4 prose-li:my-1.5"
                dangerouslySetInnerHTML={{ __html: renderDescription(job.description) }}
              />
            </section>
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

          <SoknadsbasenPanel />
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
                    prefetch
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
    </>
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
 *
 * Konvensjon i NAV-annonser: section-headers er <p><strong>Tittel</strong></p>
 * (ikke <h3>). Vi promoter mønsteret til <h3> så prose-styling gir riktig
 * vekt og spacing rundt det.
 */
function renderDescription(input: string): string {
  if (/<(p|h[1-6]|ul|ol|li|strong|em|br|a)\b/i.test(input)) {
    let out = input
      // Promoter <p><strong>Tittel</strong></p> til <h3> for riktig spacing
      .replace(/<p>\s*<strong>([^<>]{1,80})<\/strong>\s*<\/p>/g, "<h3>$1</h3>")
      // Fjern tomme paragrafer brukt som luft mellom seksjoner
      .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
    // Wrap orphan tekst (NAVs trailing employer-blurb etter <br>) i <p>
    out = out.replace(
      /(<\/(?:p|ul|ol|li|h[2-6])>|<br\s*\/?>)\s*([^<\s][^<]*?)(?=<|$)/gi,
      (match, before, text) => {
        const trimmed = text.trim();
        if (!trimmed) return match;
        const isBr = /^<br/i.test(before);
        return `${isBr ? "" : before}<p>${trimmed}</p>`;
      },
    );
    return out;
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
        <CompanyLogo website={homepage} name={name} size="lg" />
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
            {formatPhones(phone).map((p, i) => (
              <a
                key={`${p}-${i}`}
                href={`tel:${p.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 text-[#14110e]/75 hover:text-[#D5592E]"
              >
                <Phone className="size-3.5" aria-hidden />
                {p}
              </a>
            ))}
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
  const arbeidsplassenLink =
    source === "arbeidsplassen"
      ? `https://arbeidsplassen.nav.no/stillinger/stilling/${externalId}`
      : null;
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
      {(arbeidsplassenLink || externalLink) && (
        <div className="mt-5 pt-4 border-t border-black/5 text-[13px] flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2.5">
          {arbeidsplassenLink && (
            <a
              href={arbeidsplassenLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#14110e]/70 hover:text-[#D5592E] transition-colors"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Se på Arbeidsplassen.no
            </a>
          )}
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#14110e]/70 hover:text-[#D5592E] transition-colors"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Se original annonse hos arbeidsgiver
            </a>
          )}
        </div>
      )}
    </section>
  );
}

const PANEL_ITEMS: { title: string; body: string; tag: string }[] = [
  {
    title: "AI-søknadsbrev som speiler annonsen",
    body: "Skrevet med norsk konvensjon, maks 350 ord, og null amerikanske klisjéer. Tonen tilpasses bedriften, ikke en universalmal.",
    tag: "2 min",
  },
  {
    title: "CV-bygger med ATS-vennlig PDF",
    body: "8 maler, leses korrekt av Webcruiter, ReachMee og andre rekrutterings-systemer. Ingen tabeller eller bilder som rotes til.",
    tag: "8 maler",
  },
  {
    title: "Match Score for denne stillingen",
    body: "Viser hvor godt CV-en din dekker kravene i annonsen, og peker på det som mangler. Kjøres mot kompetansene fra stillingsannonsen.",
    tag: "Gratis",
  },
  {
    title: "Pipeline med kanban og frister",
    body: "Hold oversikt over alle parallelle søknader. Kladd, sendt, intervju, tilbud, avslag, med varsler for frister du ellers ville glemt.",
    tag: "Live sync",
  },
];

function SoknadsbasenPanel() {
  return (
    <aside className="relative overflow-hidden rounded-2xl bg-ink text-bg p-7 md:p-9 mb-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-[0.18]"
        style={{
          background:
            "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-7">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[10px] uppercase tracking-[0.18em] text-bg/75">
            <span
              className="size-1.5 rounded-full bg-accent"
              aria-hidden
            />
            Skreddersydd til denne stillingen
          </span>
          <span
            className="hidden md:inline-flex size-7 items-center justify-center rounded-full bg-accent/15 text-accent text-[11px] font-medium"
            aria-hidden
          >
            ◆
          </span>
        </div>

        <h2 className="text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.02em] font-medium mb-3">
          Med <em className="italic text-accent font-normal">Søknadsbasen</em> får du
        </h2>
        <p className="text-[14px] md:text-[15px] leading-[1.6] text-bg/65 max-w-[520px] mb-7">
          Fire verktøy som er bygd for norsk arbeidsliv, ikke en oversettelse av
          amerikansk programvare. Alt er klart å bruke nå.
        </p>

        <ul className="border-t border-white/10">
          {PANEL_ITEMS.map((item, i) => (
            <li
              key={item.title}
              className="grid grid-cols-[28px_1fr_auto] gap-4 items-start py-5 border-b border-white/10 last:border-b-0"
            >
              <span className="text-[11px] tracking-wide text-accent/80 font-mono pt-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] md:text-[16px] font-medium text-bg mb-1">
                  {item.title}
                </h3>
                <p className="text-[13px] leading-[1.55] text-bg/65">
                  {item.body}
                </p>
              </div>
              <span className="hidden sm:inline-flex shrink-0 items-center px-2.5 py-1 rounded-full bg-white/8 text-[10px] uppercase tracking-wider text-bg/70">
                {item.tag}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link
            href="/registrer"
            prefetch
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-accent text-bg text-[14px] font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Start gratis i kveld
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/funksjoner"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-white/20 text-bg/85 text-[14px] hover:bg-white/5 hover:border-white/35 transition-colors"
          >
            Se eksempelbrev
          </Link>
          <span className="sm:ml-auto text-[12px] text-bg/55">
            Ingen kortinfo. Norsk fra dag én.
          </span>
        </div>
      </div>
    </aside>
  );
}
