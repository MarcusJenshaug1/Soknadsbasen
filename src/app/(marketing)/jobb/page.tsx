import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { ActiveChips } from "@/components/jobb/ActiveChips";
import { AnonCvBanner, CvStatusCard } from "@/components/jobb/CvStatusCard";
import { EmptyState } from "@/components/jobb/EmptyState";
import { JobCard, type Density } from "@/components/jobb/JobCard";
import { ListHeader } from "@/components/jobb/ListHeader";
import { Pagination } from "@/components/jobb/Pagination";
import { RecommendedRow } from "@/components/jobb/RecommendedRow";
import { SeenCardWrapper } from "@/components/jobb/SeenMarker";
import { JobListSkeleton, SidebarSkeleton } from "@/components/jobb/Skeletons";
import { FilterNavProvider } from "@/components/jobb/filters/FilterNav";
import { FilterSidebar } from "@/components/jobb/filters/FilterSidebar";
import { MobileFilterSheet } from "@/components/jobb/filters/MobileFilterSheet";
import { SearchTypeahead } from "@/components/jobb/search/SearchTypeahead";
import { getSession } from "@/lib/auth";
import { getCvStatus, type CvStatus } from "@/lib/jobs/cv-status";
import { readDensity, readLastVisit } from "@/lib/jobs/density";
import { getFacetCounts, type FacetCounts } from "@/lib/jobs/facets-query";
import {
  getJobbContext,
  getJobList,
  getTopMatches,
  serializeRawParams,
  type JobListItem,
  type JobbContext,
} from "@/lib/jobs/queries";
import { jobbSeoDecision } from "@/lib/jobs/seo";
import {
  buildJobbUrl,
  countActiveFilters,
  type SortKey,
} from "@/lib/jobs/search-params";
import { buildMetadata } from "@/lib/seo/metadata";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const ctx = await getJobbContext(serializeRawParams(await searchParams));
  if (ctx.redirectTo) return buildMetadata({ path: "/jobb" });

  const { total } = await getFacetCounts(ctx.filter);
  const decision = jobbSeoDecision(ctx.params, ctx.index, total);
  const path = buildJobbUrl(ctx.params);

  if (decision.mode === "index") {
    return buildMetadata({
      path,
      canonicalPath: decision.canonicalPath,
      title: decision.title,
      description: decision.description,
    });
  }
  return buildMetadata({
    path,
    canonicalPath: decision.canonicalPath,
    title: "Ledige stillinger",
    robots: "noindex-follow",
  });
}

export default async function JobbPage({ searchParams }: Props) {
  const ctx = await getJobbContext(serializeRawParams(await searchParams));
  if (ctx.redirectTo) permanentRedirect(ctx.redirectTo);

  const session = await getSession();
  const userId = session?.userId ?? null;
  const sort: SortKey = ctx.params.sortering ?? (userId ? "match" : "nyeste");
  const activeFilters = countActiveFilters(ctx.params);

  const [density, lastVisit] = await Promise.all([
    readDensity(userId),
    readLastVisit(),
  ]);

  // Start uavhengige kilder parallelt — await skjer i Suspense-seksjonene.
  const facetsPromise = getFacetCounts(ctx.filter);
  const listPromise = getJobList({
    filter: ctx.filter,
    sort,
    side: ctx.params.side,
    userId,
  });
  const cvStatusPromise = userId ? getCvStatus(userId) : null;
  const showRecommended = Boolean(
    userId && activeFilters === 0 && ctx.params.side === 1,
  );
  const recommendedPromise = showRecommended ? getTopMatches(userId!, 3) : null;
  const listKey = `${buildJobbUrl(ctx.params)}|${sort}|${density}`;

  return (
    <FilterNavProvider>
      <header className="border-b border-border bg-bg">
        <div className="mx-auto max-w-[1280px] px-6 pb-2 pt-9 lg:px-10">
          <h1 className="text-[30px] font-medium tracking-[-0.025em] text-ink">
            Ledige stillinger
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Hele Norge, oppdatert hver time, sortert etter hva som faktisk passer deg.
          </p>
        </div>
        <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[1280px] px-6 py-3 lg:px-10">
            <div className="max-w-[640px]">
              <SearchTypeahead params={ctx.params} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-7 lg:px-10">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block" aria-label="Filtre">
            <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto pb-4">
              <Suspense fallback={<SidebarSkeleton />}>
                <SidebarSection
                  ctx={ctx}
                  facetsPromise={facetsPromise}
                  cvStatusPromise={cvStatusPromise}
                />
              </Suspense>
            </div>
          </aside>

          <section
            className="flex min-w-0 flex-col gap-4 transition-opacity [[data-filter-pending]_&]:opacity-60"
            aria-label="Stillinger"
          >
            <Suspense fallback={null}>
              <MobileSection ctx={ctx} facetsPromise={facetsPromise} />
            </Suspense>

            <ActiveChips params={ctx.params} index={ctx.index} />
            {!userId && <AnonCvBanner />}

            <Suspense key={listKey} fallback={<JobListSkeleton />}>
              <ListSection
                ctx={ctx}
                sort={sort}
                loggedIn={Boolean(userId)}
                density={density}
                lastVisit={lastVisit}
                listPromise={listPromise}
                facetsPromise={facetsPromise}
                recommendedPromise={recommendedPromise}
              />
            </Suspense>
          </section>
        </div>
      </main>
    </FilterNavProvider>
  );
}

async function SidebarSection({
  ctx,
  facetsPromise,
  cvStatusPromise,
}: {
  ctx: JobbContext;
  facetsPromise: Promise<FacetCounts>;
  cvStatusPromise: Promise<CvStatus> | null;
}) {
  const [counts, cvStatus] = await Promise.all([facetsPromise, cvStatusPromise]);
  return (
    <>
      {cvStatus && <CvStatusCard status={cvStatus} />}
      <FilterSidebar
        params={ctx.params}
        counts={counts}
        index={ctx.index}
        total={counts.total}
      />
    </>
  );
}

async function MobileSection({
  ctx,
  facetsPromise,
}: {
  ctx: JobbContext;
  facetsPromise: Promise<FacetCounts>;
}) {
  const counts = await facetsPromise;
  return (
    <MobileFilterSheet total={counts.total} activeCount={countActiveFilters(ctx.params)}>
      <FilterSidebar
        params={ctx.params}
        counts={counts}
        index={ctx.index}
        total={counts.total}
      />
    </MobileFilterSheet>
  );
}

async function ListSection({
  ctx,
  sort,
  loggedIn,
  density,
  lastVisit,
  listPromise,
  facetsPromise,
  recommendedPromise,
}: {
  ctx: JobbContext;
  sort: SortKey;
  loggedIn: boolean;
  density: Density;
  lastVisit: Date | null;
  listPromise: Promise<JobListItem[]>;
  facetsPromise: Promise<FacetCounts>;
  recommendedPromise: Promise<JobListItem[]> | null;
}) {
  const [jobs, counts, recommended] = await Promise.all([
    listPromise,
    facetsPromise,
    recommendedPromise,
  ]);
  const now = new Date();

  return (
    <>
      {recommended && <RecommendedRow jobs={recommended} />}
      <ListHeader
        total={counts.total}
        params={ctx.params}
        sort={sort}
        loggedIn={loggedIn}
        density={density}
      />
      {jobs.length === 0 ? (
        <EmptyState params={ctx.params} counts={counts} index={ctx.index} />
      ) : (
        <ul
          className={`flex flex-col ${density === "kompakt" ? "gap-2" : "gap-2.5"}`}
        >
          {jobs.map((job) => (
            <li key={job.id}>
              <SeenCardWrapper
                jobId={job.id}
                slug={job.slug}
                loggedIn={loggedIn}
                seenOnServer={job.seen}
              >
                <JobCard
                  job={job}
                  density={density}
                  loggedIn={loggedIn}
                  now={now}
                  isNew={lastVisit !== null && job.publishedAt > lastVisit}
                />
              </SeenCardWrapper>
            </li>
          ))}
        </ul>
      )}
      <Pagination params={ctx.params} total={counts.total} />
    </>
  );
}
