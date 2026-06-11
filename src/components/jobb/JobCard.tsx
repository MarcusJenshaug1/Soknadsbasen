import Link from "next/link";
import { FiClock, FiMapPin } from "react-icons/fi";

import { CompanyLogo } from "@/components/ui/CompanyLogo";
import type { JobListItem } from "@/lib/jobs/queries";
import { cn } from "@/lib/cn";

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
 * initial-merke, metarad, pills og match-label i høyrekolonnen. Tetthet
 * styrer logo/utdrag/pills. Sett-dimming og pipeline-knapp kobles på i Fase 2.
 */
export function JobCard({
  job,
  density,
  loggedIn,
  now,
}: {
  job: JobListItem;
  density: Density;
  loggedIn: boolean;
  now: Date;
}) {
  const compact = density === "kompakt";
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
    <article
      className={cn(
        "group relative rounded-2xl border border-border bg-surface transition-all hover:border-border-strong hover:shadow-[0_2px_14px_rgba(20,17,14,0.06)]",
        compact ? "px-4 py-3" : "px-5 py-4",
      )}
    >
      <div className="flex items-start gap-3.5">
        {!compact && (
          <CompanyLogo website={job.employerHomepage} name={job.employerName} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "truncate font-medium leading-snug text-ink",
              compact ? "text-[14px]" : "text-[15.5px]",
            )}
          >
            <Link
              href={`/jobb/${job.slug}`}
              prefetch
              scroll={false}
              className="text-left outline-none after:absolute after:inset-0 after:content-[''] hover:text-accent-ink focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-accent/50"
            >
              {job.title}
            </Link>
          </h3>
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-ink-soft",
              compact ? "mt-0.5" : "mt-1",
            )}
          >
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
          {!compact && job.excerpt && (
            <p className="mt-2 line-clamp-1 text-[12.5px] leading-relaxed text-ink-soft">
              {job.excerpt}
            </p>
          )}
          {!compact && pills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
          <MatchLabel score={job.matchScore} loggedIn={loggedIn} compact={compact} />
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
        </div>
      </div>
    </article>
  );
}
