"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDoc,
  IconGrid,
  IconHome,
  IconTrend,
  IconUser,
} from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/app", label: "Hjem", Icon: IconHome, match: (p: string) => p === "/app" },
  { href: "/app/cv", label: "CV", Icon: IconDoc, match: (p: string) => p.startsWith("/app/cv") },
  {
    href: "/app/pipeline",
    label: "Søknader",
    Icon: IconGrid,
    match: (p: string) => p.startsWith("/app/pipeline"),
  },
  {
    href: "/app/innsikt",
    label: "Innsikt",
    Icon: IconTrend,
    match: (p: string) => p.startsWith("/app/innsikt"),
  },
  {
    href: "/app/profil",
    label: "Deg",
    Icon: IconUser,
    match: (p: string) => p.startsWith("/app/profil"),
  },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-t border-black/8 pb-[env(safe-area-inset-bottom)] px-2 pt-2 print:hidden"
      aria-label="Hovednavigasjon"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className="flex flex-col items-center gap-1 py-1"
              >
                <span
                  className={cn(
                    active ? "text-[#14110e]" : "text-[#14110e]/40",
                  )}
                >
                  <t.Icon size={20} />
                </span>
                <span
                  className={cn(
                    "text-[10px]",
                    active
                      ? "text-[#14110e] font-medium"
                      : "text-[#14110e]/50",
                  )}
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
