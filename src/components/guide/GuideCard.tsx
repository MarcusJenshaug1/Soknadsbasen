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
      className="group block border-t border-black/10 py-7 md:py-8 transition-colors hover:bg-black/[0.015]"
    >
      <div className="flex items-baseline justify-between gap-4 mb-3 text-[11px] text-[#14110e]/55">
        <span className="uppercase tracking-[0.2em] text-[#D5592E]">
          {tag ?? "Guide"}
        </span>
        <span>
          {formatGuideDate(fm.updatedAt ?? fm.publishedAt)} · {readingMinutes} min
        </span>
      </div>
      <h2 className="text-[22px] md:text-[28px] leading-[1.2] tracking-[-0.02em] font-medium text-[#14110e] mb-3 group-hover:text-[#D5592E] transition-colors">
        {fm.title}
      </h2>
      <p className="text-[14px] md:text-[15px] leading-[1.65] text-[#14110e]/70 mb-4 max-w-[68ch]">
        {fm.description}
      </p>
      <span className="inline-flex items-center gap-1 text-[13px] text-[#D5592E]">
        Les guiden
        <FiArrowUpRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
