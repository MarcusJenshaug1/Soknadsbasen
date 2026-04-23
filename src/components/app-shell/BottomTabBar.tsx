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

type Tab = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  match: (p: string) => boolean;
  gated: boolean;
};

const TABS: readonly Tab[] = [
  { href: "/app", label: "Hjem", Icon: IconHome, match: (p) => p === "/app", gated: true },
  { href: "/app/cv", label: "CV", Icon: IconDoc, match: (p) => p.startsWith("/app/cv"), gated: true },
  {
    href: "/app/pipeline",
    label: "Søknader",
    Icon: IconGrid,
    match: (p) => p.startsWith("/app/pipeline"),
    gated: true,
  },
  {
    href: "/app/innsikt",
    label: "Innsikt",
    Icon: IconTrend,
    match: (p) => p.startsWith("/app/innsikt"),
    gated: true,
  },
  {
    href: "/app/profil",
    label: "Deg",
    Icon: IconUser,
    match: (p) => p.startsWith("/app/profil"),
    gated: false,
  },
  {
    href: "/app/billing",
    label: "Abo",
    Icon: IconDoc,
    match: (p) => p.startsWith("/app/billing"),
    gated: false,
  },
] as const;

export function BottomTabBar({ hasAccess }: { hasAccess: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => hasAccess || !t.gated);
  const cols = tabs.length;
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-t border-black/8 pb-[env(safe-area-inset-bottom)] px-2 pt-2 print:hidden"
      aria-label="Hovednavigasjon"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
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
