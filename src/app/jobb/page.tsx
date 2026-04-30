import Link from "next/link";
import { Briefcase, Building2, Calendar, MapPin, Users } from "lucide-react";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { displayPlace, isValidFacet } from "@/lib/jobs/format";
import { JobsFilterBar } from "./JobsFilterBar";
import { SaveButton } from "./SaveButton";

export const revalidate = 1800;

export const metadata = buildMetadata({
  path: "/jobb",
  title: "Stillinger i Norge",
  description:
    "Stillinger fra Arbeidsplassen.no, kuratert med klare URL-er og automatisk Match Score mot CV-en din. Finn og søk på relevante stillinger.",
});

const breadcrumbs = [
  { name: "Søknadsbasen", path: "/" },
  { name: "Stillinger", path: "/jobb" },
];

type SearchParams = Promise<{
  q?: string;
  region?: string;
  kategori?: string;
  side?: string;
}>;

const PAGE_SIZE = 20;

export default async function JobsHubPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const region = (params.region ?? "").trim();
  const kategori = (params.kategori ?? "").trim();
  const side = Math.max(1, Number(params.side) || 1);

  const where = {
    isActive: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { employerName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(region ? { region: { equals: region, mode: "insensitive" as const } } : {}),
    ...(kategori
      ? { category: { equals: kategori, mode: "insensitive" as const } }
      : {}),
  };

  // Start session i parallell med jobs-spørringene istedenfor å vente på
  // den først. getSession() = 1 Supabase HTTP + 1 Prisma user-lookup, så
  // vi sparer ~50-150 ms per render ved å overlappe med findMany/groupBy.
  const sessionPromise = getSession();

  const [jobs, total, regionsRaw, categoriesRaw] = await Promise.all([
    prisma.job.findMany({
      where,
      select: {
        slug: true,
        title: true,
        employerName: true,
        location: true,
        region: true,
        category: true,
        publishedAt: true,
        expiresAt: true,
        applicationDueAt: true,
        positionCount: true,
        engagementType: true,
        extent: true,
        sector: true,
      },
      orderBy: { publishedAt: "desc" },
      take: PAGE_SIZE,
      skip: (side - 1) * PAGE_SIZE,
    }),
    prisma.job.count({ where }),
    prisma.job.groupBy({
      by: ["region"],
      where: { isActive: true, region: { not: null } },
      _count: { region: true },
      orderBy: { _count: { region: "desc" } },
      take: 20,
    }),
    prisma.job.groupBy({
      by: ["category"],
      where: { isActive: true, category: { not: null } },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: 20,
    }),
  ]);

  const session = await sessionPromise;

  const regions = regionsRaw
    .map((r) => r.region)
    .filter(isValidFacet);
  const categories = categoriesRaw
    .map((c) => c.category)
    .filter(isValidFacet);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Resolve which of the visible jobs are already saved by the user. Cheap
  // single query: filter on jobUrl matching any of the visible slugs.
  const visibleSlugs = jobs.map((j) => j.slug);
  const savedSlugSet = new Set<string>();
  if (session && visibleSlugs.length > 0) {
    const candidates = visibleSlugs.flatMap((s) => [
      absoluteUrl(`/jobb/${s}`),
      `/jobb/${s}`,
    ]);
    const saved = await prisma.jobApplication.findMany({
      where: { userId: session.userId, jobUrl: { in: candidates } },
      select: { jobUrl: true },
    });
    for (const row of saved) {
      if (!row.jobUrl) continue;
      const m = row.jobUrl.match(/\/jobb\/([^/?#]+)/);
      if (m) savedSlugSet.add(m[1]);
    }
  }
  const isLoggedIn = Boolean(session);

  return (
    <>
      <JsonLdScript data={breadcrumbJsonLd(breadcrumbs)} />

      <main className="max-w-[1100px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-10">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <section className="pt-6 md:pt-10 pb-10 max-w-[680px]">
          <SectionLabel tone="accent" className="mb-4">
            Stillinger
          </SectionLabel>
          <h1 className="text-[40px] md:text-[60px] leading-[1.02] tracking-[-0.035em] font-medium mb-6">
            Stillinger i Norge, kuratert.
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.65] text-[#14110e]/75">
            {total > 0
              ? `${total.toLocaleString("nb-NO")} aktive stillinger fra Arbeidsplassen.no.`
              : "Stillinger fra Arbeidsplassen.no."}{" "}
            Klare URL-er, ren tekst, og direkte kobling til Søknadsbasens
            CV-bygger og søknadsbrev-modul.
          </p>
        </section>

        <JobsFilterBar
          q={q}
          region={region}
          kategori={kategori}
          regions={regions}
          categories={categories}
        />

        <section
          aria-label="Stillinger"
          className="mt-8"
        >
          {jobs.length === 0 ? (
            <NoResults q={q} />
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li key={job.slug}>
                  <JobCard
                    slug={job.slug}
                    title={job.title}
                    employerName={job.employerName}
                    location={job.location}
                    category={job.category}
                    publishedAt={job.publishedAt}
                    expiresAt={job.expiresAt}
                    applicationDueAt={job.applicationDueAt}
                    positionCount={job.positionCount}
                    engagementType={job.engagementType}
                    extent={job.extent}
                    sector={job.sector}
                    isLoggedIn={isLoggedIn}
                    saved={savedSlugSet.has(job.slug)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {totalPages > 1 && (
          <Pagination
            current={side}
            total={totalPages}
            params={{ q, region, kategori }}
          />
        )}
      </main>
    </>
  );
}

function JobCard({
  slug,
  title,
  employerName,
  location,
  category,
  publishedAt,
  expiresAt,
  applicationDueAt,
  positionCount,
  engagementType,
  extent,
  sector,
  isLoggedIn,
  saved,
}: {
  slug: string;
  title: string;
  employerName: string;
  location: string | null;
  category: string | null;
  publishedAt: Date;
  expiresAt: Date | null;
  applicationDueAt: Date | null;
  positionCount: number | null;
  engagementType: string | null;
  extent: string | null;
  sector: string | null;
  isLoggedIn: boolean;
  saved: boolean;
}) {
  const daysAgo = Math.floor(
    (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dueAt = applicationDueAt ?? expiresAt;
  const daysToExpiry = dueAt
    ? Math.floor((dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const employmentLabel = [engagementType, extent]
    .filter((p): p is string => Boolean(p))
    .join(" · ");

  const isFresh = daysAgo <= 1;
  const isUrgent = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 3;

  return (
    <div className="relative group">
      <Link
        prefetch
        href={`/jobb/${slug}`}
        className="block rounded-2xl border border-black/10 bg-white hover:border-[#14110e]/30 hover:bg-[#eee9df]/40 hover:shadow-[0_2px_12px_rgba(20,17,14,0.04)] transition-all px-5 py-4 md:py-5 pr-16"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {isFresh && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 uppercase tracking-wide">
                  Ny
                </span>
              )}
              {isUrgent && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#D5592E]/10 text-[#D5592E] uppercase tracking-wide">
                  {daysToExpiry === 0
                    ? "Frist i dag"
                    : daysToExpiry === 1
                      ? "Frist i morgen"
                      : `${daysToExpiry} dager igjen`}
                </span>
              )}
            </div>
            <h3 className="text-[16px] md:text-[18px] font-medium tracking-tight mb-1.5 group-hover:text-[#D5592E] transition-colors">
              {title}
            </h3>
            <div className="text-[13px] text-[#14110e]/70 font-medium">
              {employerName}
            </div>
          </div>
          {category && (
            <span className="hidden sm:inline-flex shrink-0 px-2.5 py-1 rounded-full text-[11px] bg-[#eee9df] text-[#14110e]/70">
              {category}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#14110e]/60">
          {location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-[#14110e]/40" aria-hidden />
              {displayPlace(location)}
            </span>
          )}
          {employmentLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-[#14110e]/40" aria-hidden />
              {employmentLabel}
            </span>
          )}
          {sector && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-3.5 text-[#14110e]/40" aria-hidden />
              {sector}
            </span>
          )}
          {typeof positionCount === "number" && positionCount > 1 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5 text-[#14110e]/40" aria-hidden />
              {positionCount} stillinger
            </span>
          )}
          {daysToExpiry !== null && daysToExpiry >= 0 && !isUrgent && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5 text-[#14110e]/40" aria-hidden />
              {daysToExpiry === 0
                ? "Frist i dag"
                : `${daysToExpiry} dager til frist`}
            </span>
          )}
          <span className="ml-auto text-[11px] text-[#14110e]/45">
            {daysAgo === 0 ? "I dag" : `${daysAgo}d siden`}
          </span>
        </div>
      </Link>

      <div className="absolute top-3 right-3 md:top-4 md:right-4">
        <SaveButton
          slug={slug}
          isLoggedIn={isLoggedIn}
          initialSaved={saved}
        />
      </div>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#eee9df]/40 p-8 md:p-12 text-center">
      <h3 className="text-[20px] md:text-[24px] font-medium mb-3">
        {q ? `Ingen stillinger matcher "${q}"` : "Ingen stillinger akkurat nå"}
      </h3>
      <p className="text-[14px] text-[#14110e]/65 max-w-[480px] mx-auto mb-6">
        {q
          ? "Prøv en kortere søkeord, eller bla gjennom alle stillinger via filteret over."
          : "Vi henter nye stillinger automatisk fra Arbeidsplassen.no hver time."}
      </p>
      {q && (
        <Link
          prefetch
          href="/jobb"
          className="inline-flex px-5 py-2.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] hover:bg-[#a94424] transition-colors"
        >
          Se alle stillinger
        </Link>
      )}
    </div>
  );
}

function Pagination({
  current,
  total,
  params,
}: {
  current: number;
  total: number;
  params: { q: string; region: string; kategori: string };
}) {
  const buildUrl = (page: number) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.region) sp.set("region", params.region);
    if (params.kategori) sp.set("kategori", params.kategori);
    if (page > 1) sp.set("side", String(page));
    const qs = sp.toString();
    return `/jobb${qs ? `?${qs}` : ""}`;
  };

  return (
    <nav
      aria-label="Sidenavigasjon"
      className="mt-10 flex items-center justify-between gap-3 text-[13px]"
    >
      <Link
        prefetch
        href={buildUrl(current - 1)}
        aria-disabled={current === 1}
        className={
          current === 1
            ? "px-4 py-2 rounded-full text-[#14110e]/30 pointer-events-none"
            : "px-4 py-2 rounded-full text-[#14110e]/70 hover:bg-black/5 hover:text-[#14110e] transition-colors"
        }
      >
        ← Forrige
      </Link>
      <span className="text-[12px] text-[#14110e]/55">
        Side {current} av {total}
      </span>
      <Link
        prefetch
        href={buildUrl(current + 1)}
        aria-disabled={current === total}
        className={
          current === total
            ? "px-4 py-2 rounded-full text-[#14110e]/30 pointer-events-none"
            : "px-4 py-2 rounded-full text-[#14110e]/70 hover:bg-black/5 hover:text-[#14110e] transition-colors"
        }
      >
        Neste →
      </Link>
    </nav>
  );
}
