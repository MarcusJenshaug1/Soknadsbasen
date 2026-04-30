import Link from "next/link";
import { FOOTER_COLUMNS } from "./marketing-nav-data";

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#faf8f5]">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/45 mb-4">
                {col.title}
              </div>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => {
                  const external = link.href.startsWith("mailto:") || link.href.startsWith("http");
                  if (external) {
                    return (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className="text-[13px] text-[#14110e]/70 hover:text-[#14110e]"
                        >
                          {link.label}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        prefetch
                        className="text-[13px] text-[#14110e]/70 hover:text-[#14110e]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
                {col.viewAll ? (
                  <li>
                    <Link
                      href={col.viewAll.href}
                      prefetch
                      className="text-[13px] text-[#D5592E] hover:text-[#a94424]"
                    >
                      {col.viewAll.label} →
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-black/10 pt-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#14110e]/55">
          <span>© 2026 Søknadsbasen</span>
          <a
            href="https://marcusjenshaug.no"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#14110e]"
          >
            laget av Marcus Jenshaug
          </a>
        </div>
      </div>
    </footer>
  );
}
