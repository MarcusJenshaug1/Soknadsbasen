import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { getSession } from "@/lib/auth";
import { getJobBySlug } from "@/lib/jobs/get-job";
import { computeMatchBreakdown } from "@/lib/jobs/match-breakdown";
import { getRelatedJobs } from "@/lib/jobs/related";
import { getSavedApplicationId } from "@/lib/jobs/saved";

import { SeenOnMount } from "../SeenMarker";
import { DetailCtas } from "./DetailCtas";
import { KeyInfoBox } from "./KeyInfoBox";
import { MatchBreakdownCard } from "./MatchBreakdownCard";
import { SimilarJobs } from "./SimilarJobs";

/**
 * Innholdet i hurtigvisningen (designreferansen): header m/initial-merke og
 * pills, nøkkelinfo, match-breakdown, kort utdrag av annonsen m/lenke til full
 * side, lignende stillinger og sticky CTA-footer. Server-rendret — modalen
 * rundt er klient.
 */
export async function QuickViewContent({ slug }: { slug: string }) {
  const job = await getJobBySlug(slug);
  if (!job) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-[14px] text-ink-soft">Fant ikke stillingen.</p>
        <Link href="/jobb" className="mt-2 inline-block text-[13px] text-accent underline-offset-2 hover:underline">
          Til stillingslisten
        </Link>
      </div>
    );
  }

  const session = await getSession();
  const [savedId, breakdown, similar] = await Promise.all([
    session ? getSavedApplicationId(session.userId, slug) : null,
    session ? computeMatchBreakdown(session.userId, job.id) : null,
    getRelatedJobs(job, 2),
  ]);

  const pills: string[] = [];
  if (job.extent) pills.push(job.extent);
  if (job.engagementType) pills.push(job.engagementType);
  if (job.aiRemote === "hybrid") pills.push("Hybrid");
  if (job.aiRemote === "hjemmekontor") pills.push("Hjemmekontor");
  if (job.isSummerJob) pills.push("Sommerjobb");

  const excerpt = job.description
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 450);

  return (
    <>
      <SeenOnMount jobId={job.id} slug={job.slug} />

      <div className="flex items-start gap-4 px-6 pb-4 pr-14 pt-6 sm:px-8">
        <CompanyLogo website={job.employerHomepage} name={job.employerName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-ink-soft">{job.employerName}</div>
          <h2 className="mt-0.5 text-[20px] font-medium leading-tight tracking-[-0.01em] text-ink">
            {job.title}
          </h2>
          {pills.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {pills.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="inline-flex h-[22px] items-center rounded-full border border-border bg-bg px-2.5 text-[10.5px] font-medium text-ink-soft"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-6 sm:px-8">
        <KeyInfoBox job={job} />
        {breakdown && <MatchBreakdownCard breakdown={breakdown} />}

        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
            Om stillingen
          </h3>
          <p className="text-[13.5px] leading-[1.7] text-ink-soft">
            {excerpt}
            {excerpt.length >= 450 ? "…" : ""}
          </p>
          <Link
            href={`/jobb/${job.slug}`}
            target="_blank"
            className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-ink underline-offset-2 hover:underline"
          >
            Se hele annonsen <FiArrowRight size={12} aria-hidden />
          </Link>
        </section>

        <SimilarJobs jobs={similar} />
      </div>

      <div className="sticky bottom-0 rounded-b-3xl border-t border-border bg-surface px-6 py-4 sm:px-8">
        <DetailCtas
          slug={job.slug}
          isLoggedIn={Boolean(session)}
          initialSavedId={savedId}
          applyUrl={job.applyUrl}
          employerName={job.employerName}
        />
      </div>
    </>
  );
}
