import Link from "next/link";

import { PAGE_SIZE } from "@/lib/jobs/queries";
import { buildJobbUrl, type JobbParams } from "@/lib/jobs/search-params";

import { fmtCount } from "./ListHeader";

/**
 * Runde tallknapper (designreferansen): 1 2 3 … siste, med vindu rundt
 * gjeldende side. Rene lenker m/scroll til toppen av listen.
 */
export function Pagination({
  params,
  total,
}: {
  params: JobbParams;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;

  const current = Math.min(params.side, pages);
  const items = pageWindow(current, pages);

  return (
    <nav aria-label="Sider" className="mt-2 flex items-center justify-center gap-1.5">
      {items.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-[12px] text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildJobbUrl({ ...params, side: p })}
            aria-current={p === current ? "page" : undefined}
            rel={p === current - 1 ? "prev" : p === current + 1 ? "next" : undefined}
            className={
              p === current
                ? "flex h-9 min-w-[36px] items-center justify-center rounded-full bg-ink px-2 text-[12.5px] font-medium text-bg"
                : "flex h-9 min-w-[36px] items-center justify-center rounded-full px-2 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-panel"
            }
          >
            {fmtCount(p)}
          </Link>
        ),
      )}
    </nav>
  );
}

function pageWindow(current: number, pages: number): (number | "gap")[] {
  const wanted = new Set<number>([1, pages, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}
