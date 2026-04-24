import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";

export type BreadcrumbItem = { name: string; path: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Brødsmulesti"
      className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 flex items-center flex-wrap gap-1"
    >
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={it.path} className="inline-flex items-center gap-1">
            {last ? (
              <span aria-current="page" className="text-[#14110e]/70 dark:text-[#f0ece6]/70">
                {it.name}
              </span>
            ) : (
              <Link href={it.path} className="hover:text-ink">
                {it.name}
              </Link>
            )}
            {!last ? (
              <FiChevronRight className="w-3 h-3 text-[#14110e]/35 dark:text-[#f0ece6]/35" />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
