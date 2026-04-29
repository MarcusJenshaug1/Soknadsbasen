import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SectionLabel } from "@/components/ui/Pill";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { prisma } from "@/lib/prisma";
import { HeaderCTA } from "../LandingCTAs";
import { JobsFilterBar } from "./JobsFilterBar";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

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

  const regions = regionsRaw
    .map((r) => r.region)
    .filter((x): x is string => Boolean(x));
  const categories = categoriesRaw
    .map((c) => c.category)
    .filter((x): x is string => Boolean(x));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <JsonLdScript data={breadcrumbJsonLd(breadcrumbs)} />

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

function JobCard({
  slug,
  title,
  employerName,
  location,
  category,
  publishedAt,
  expiresAt,
}: {
  slug: string;
  title: string;
  employerName: string;
  location: string | null;
  category: string | null;
  publishedAt: Date;
  expiresAt: Date | null;
}) {
  const daysAgo = Math.floor(
    (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysToExpiry = expiresAt
    ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link
      href={`/jobb/${slug}`}
      className="block rounded-2xl border border-black/10 bg-white hover:border-[#14110e]/30 hover:bg-[#eee9df]/40 transition-colors px-5 py-4 md:py-5 group"
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] md:text-[18px] font-medium tracking-tight mb-1 group-hover:text-[#D5592E] transition-colors">
            {title}
          </h3>
          <div className="text-[13px] text-[#14110e]/70">
            <span className="font-medium">{employerName}</span>
            {location ? <span className="text-[#14110e]/50"> · {location}</span> : null}
          </div>
        </div>
        {category && (
          <span className="hidden sm:inline-flex shrink-0 px-2.5 py-1 rounded-full text-[11px] bg-[#eee9df] text-[#14110e]/70">
            {category}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[#14110e]/50">
        <span>{daysAgo === 0 ? "I dag" : `${daysAgo} dager siden`}</span>
        {daysToExpiry !== null && daysToExpiry >= 0 && (
          <>
            <span className="text-[#14110e]/25">·</span>
            <span className={daysToExpiry <= 3 ? "text-[#D5592E]" : ""}>
              {daysToExpiry === 0
                ? "Frist i dag"
                : daysToExpiry === 1
                  ? "Frist i morgen"
                  : `${daysToExpiry} dager til frist`}
            </span>
          </>
        )}
      </div>
    </Link>
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
