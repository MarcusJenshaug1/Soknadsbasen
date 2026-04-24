import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import type { Guide } from "@/lib/guide/types";
import { formatGuideDate } from "@/lib/guide/format";

export function GuideCard({ guide }: { guide: Guide }) {
  const { frontmatter: fm, readingMinutes } = guide;
  const tag = fm.tags?.[0];
  return (
    <Link
      href={`/guide/${fm.slug}`}
      className="group block border-t border-black/10 dark:border-white/10 py-7 md:py-8 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015]"
    >
      <div className="flex items-baseline justify-between gap-4 mb-3 text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
        <span className="uppercase tracking-[0.2em] text-accent">
          {tag ?? "Guide"}
        </span>
        <span>
          {formatGuideDate(fm.updatedAt ?? fm.publishedAt)} · {readingMinutes} min
        </span>
      </div>
      <h2 className="text-[22px] md:text-[28px] leading-[1.2] tracking-[-0.02em] font-medium text-ink mb-3 group-hover:text-accent transition-colors">
        {fm.title}
      </h2>
      <p className="text-[14px] md:text-[15px] leading-[1.65] text-[#14110e]/70 dark:text-[#f0ece6]/70 mb-4 max-w-[68ch]">
        {fm.description}
      </p>
      <span className="inline-flex items-center gap-1 text-[13px] text-accent">
        Les guiden
        <FiArrowUpRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
