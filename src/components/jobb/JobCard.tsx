import Link from "next/link";
import { FiClock, FiMapPin } from "react-icons/fi";

import { CompanyLogo } from "@/components/ui/CompanyLogo";
import type { JobListItem } from "@/lib/jobs/queries";
import { cn } from "@/lib/cn";

import { AddToPipelineButton } from "./AddToPipelineButton";
import { MatchLabel } from "./MatchLabel";

export type Density = "komfortabel" | "kompakt";

const FRIST_FMT = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" });
const DAY_MS = 24 * 60 * 60 * 1000;

export function publishedLabel(publishedAt: Date, now: Date): string {
  const days = Math.floor((now.getTime() - publishedAt.getTime()) / DAY_MS);
  if (days < 1) return "I dag";
  if (days < 2) return "I går";
  return `${days} d. siden`;
}

/**
 * Stillingskort (designreferansen): hele kortet klikkbart via stretched link,
 * initial-merke, metarad, pills og match-label i høyrekolonnen. Begge
 * tetthetsvarianter rendres i samme markup og styres av data-density på
 * DensityProvider-wrapperen (group/density), så tetthetsbytte er ren CSS.
 */
export function JobCard({
  job,
  loggedIn,
  now,
  isNew = false,
}: {
  job: JobListItem;
  loggedIn: boolean;
  now: Date;
  /** Publisert etter forrige besøk («Ny»-markering). */
  isNew?: boolean;
}) {
  const sted = job.kommune ?? job.region;
  const dueDays = job.applicationDueAt
    ? Math.ceil((job.applicationDueAt.getTime() - now.getTime()) / DAY_MS)
    : null;

  const pills: string[] = [];
  if (job.extent) pills.push(job.extent);
  if (job.engagementType) pills.push(job.engagementType);
  if (job.aiRemote === "hybrid") pills.push("Hybrid");
  if (job.aiRemote === "hjemmekontor") pills.push("Hjemmekontor");
  if (job.isSummerJob) pills.push("Sommerjobb");

  return (
    <article className="group relative rounded-2xl border border-border bg-surface px-5 py-4 transition-all hover:border-border-strong hover:shadow-[0_2px_14px_rgba(20,17,14,0.06)] group-data-[density=kompakt]/density:px-4 group-data-[density=kompakt]/density:py-3">
      <div className="flex items-start gap-3.5">
        <div className="shrink-0 group-data-[density=kompakt]/density:hidden">
          <CompanyLogo website={job.employerHomepage} name={job.employerName} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-[15.5px] font-medium leading-snug text-ink group-data-[density=kompakt]/density:text-[14px]">
            {isNew && !job.seen && (
              <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-accent px-2 text-[9.5px] font-bold uppercase tracking-wide text-white">
                Ny
              </span>
            )}
            <Link
              href={`/jobb/${job.slug}`}
              prefetch
              scroll={false}
              className="truncate text-left outline-none after:absolute after:inset-0 after:content-[''] hover:text-accent-ink focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-accent/50"
            >
              {job.title}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-ink-soft group-data-[density=kompakt]/density:mt-0.5">
            <span className="font-medium">{job.employerName}</span>
            {sted && (
              <span className="inline-flex items-center gap-1 text-ink-muted">
                <FiMapPin size={11} aria-hidden />
                {sted}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <FiClock size={11} aria-hidden />
              {publishedLabel(job.publishedAt, now)}
            </span>
          </div>
          {job.excerpt && (
            <p className="mt-2 line-clamp-1 text-[12.5px] leading-relaxed text-ink-soft group-data-[density=kompakt]/density:hidden">
              {job.excerpt}
            </p>
          )}
          {pills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 group-data-[density=kompakt]/density:hidden">
              {pills.slice(0, 4).map((p) => (
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
        <div className="relative z-10 flex shrink-0 flex-col items-end gap-1.5">
          <MatchLabel score={job.matchScore} loggedIn={loggedIn} />
          {job.applicationDueAt && (
            <span
              className={cn(
                "text-[11px] tabular-nums",
                dueDays !== null && dueDays <= 7
                  ? "font-medium text-accent-ink"
                  : "text-ink-muted",
              )}
            >
              Frist {FRIST_FMT.format(job.applicationDueAt)}
            </span>
          )}
          <div className="group-data-[density=kompakt]/density:hidden">
            <AddToPipelineButton slug={job.slug} loggedIn={loggedIn} />
          </div>
        </div>
      </div>
    </article>
  );
}
