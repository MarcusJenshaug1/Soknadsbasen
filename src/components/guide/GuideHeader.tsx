import type { Guide } from "@/lib/guide/types";
import { formatGuideDate } from "@/lib/guide/format";

export function GuideHeader({ guide }: { guide: Guide }) {
  const { frontmatter: fm, readingMinutes } = guide;
  const tag = fm.tags?.[0];
  return (
    <header className="mb-12">
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] mb-6">
        <span className="text-accent">{tag ?? "Guide"}</span>
        <span className="w-1 h-1 rounded-full bg-[#14110e]/30 dark:bg-[#f0ece6]/30" />
        <span className="text-[#14110e]/55 dark:text-[#f0ece6]/55">{readingMinutes} min lesing</span>
      </div>
      <h1 className="text-[36px] sm:text-[48px] md:text-[64px] leading-[1.02] tracking-[-0.035em] font-medium text-ink mb-6">
        {fm.title}
      </h1>
      <p className="text-[17px] md:text-[19px] leading-[1.55] text-[#14110e]/70 dark:text-[#f0ece6]/70 max-w-[68ch] mb-6">
        {fm.description}
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
        <span>
          Av{" "}
          <span className="text-[#14110e]/80 dark:text-[#f0ece6]/80">{fm.author.name}</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-[#14110e]/25 dark:bg-[#f0ece6]/25" />
        <span>
          Publisert {formatGuideDate(fm.publishedAt)}
        </span>
        {fm.updatedAt && fm.updatedAt !== fm.publishedAt ? (
          <>
            <span className="w-1 h-1 rounded-full bg-[#14110e]/25 dark:bg-[#f0ece6]/25" />
            <span>Oppdatert {formatGuideDate(fm.updatedAt)}</span>
          </>
        ) : null}
      </div>
    </header>
  );
}

export function GuideTldr({ tldr }: { tldr: string[] }) {
  if (!tldr || tldr.length === 0) return null;
  return (
    <aside
      aria-label="Kort oppsummering"
      className="mb-14 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f3ede3]/60 dark:bg-panel/40 p-7 md:p-8"
    >
      <div className="text-[11px] uppercase tracking-[0.2em] text-accent mb-3">
        Kort sagt
      </div>
      <ul className="space-y-2.5 text-[15px] leading-[1.55] text-[#14110e]/85 dark:text-[#f0ece6]/85">
        {tldr.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
