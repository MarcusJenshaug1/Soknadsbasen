import type { GuideTocItem } from "@/lib/guide/types";

export function TOC({ items }: { items: GuideTocItem[] }) {
  if (items.length < 3) return null;
  return (
    <aside
      aria-labelledby="toc-heading"
      className="hidden lg:block sticky top-24 self-start"
    >
      <h2
        id="toc-heading"
        className="text-[11px] uppercase tracking-[0.2em] text-accent mb-4"
      >
        I denne guiden
      </h2>
      <ol className="space-y-2 text-[13px] leading-[1.5] border-l border-black/10 dark:border-white/10">
        {items.map((it) => (
          <li
            key={it.id}
            className={it.depth === 3 ? "pl-6" : "pl-4"}
          >
            <a
              href={`#${it.id}`}
              className="block -ml-px pl-0 border-l-2 border-transparent hover:border-accent hover:text-ink text-[#14110e]/60 dark:text-[#f0ece6]/60 transition-colors py-0.5"
            >
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
