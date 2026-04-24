"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconDoc,
  IconGrid,
  IconHome,
  IconTrend,
  IconUser,
  IconMoreHorizontal,
} from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { NotificationBell } from "./NotificationBell";

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
] as const;

const MORE_ROUTES = [
  "/app/brev",
  "/app/oppgaver",
  "/app/selskaper",
  "/app/nettverk",
  "/app/sesjoner",
  "/app/billing",
];

const MORE_ITEMS = [
  { href: "/app/brev", label: "Søknadsbrev", gated: true },
  { href: "/app/oppgaver", label: "Oppgaver", gated: true },
  { href: "/app/selskaper", label: "Selskaper", gated: true },
  { href: "/app/nettverk", label: "Nettverk", gated: true },
  { href: "/app/sesjoner", label: "Sesjoner", gated: true },
  { href: "/app/billing", label: "Abonnement", gated: false },
  { href: "/om", label: "Om Marcus Jenshaug", gated: false },
];

export function BottomTabBar({ hasAccess }: { hasAccess: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = TABS.filter((t) => hasAccess || !t.gated);
  const visibleMoreItems = MORE_ITEMS.filter((i) => hasAccess || !i.gated);
  const moreActive = MORE_ROUTES.some((r) => pathname.startsWith(r));
  const cols = tabs.length + 1; // +1 for "Mer"

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+60px)] left-2 right-2 z-50 bg-bg border border-black/8 dark:border-white/8 rounded-3xl shadow-lg overflow-hidden md:hidden">
            {hasAccess && (
              <div className="px-4 pt-3 pb-2 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                <NotificationBell />
                <span className="text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60">Varsler</span>
              </div>
            )}
            <div className="px-2 py-2 space-y-0.5">
              {visibleMoreItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-2xl text-[14px] transition-colors",
                      active
                        ? "bg-ink text-bg font-medium"
                        : "text-ink hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur-md border-t border-black/8 dark:border-white/8 pb-[env(safe-area-inset-bottom)] px-2 pt-2 print:hidden"
        aria-label="Hovednavigasjon"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {tabs.map((t) => {
            const active = t.match(pathname);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  prefetch={true}
                  className="flex flex-col items-center gap-1 py-1"
                >
                  <span className={cn(active ? "text-ink" : "text-[#14110e]/40 dark:text-[#f0ece6]/40")}>
                    <t.Icon size={20} />
                  </span>
                  <span className={cn("text-[10px]", active ? "text-ink font-medium" : "text-[#14110e]/50 dark:text-[#f0ece6]/50")}>
                    {t.label}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Mer-tab */}
          <li>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="w-full flex flex-col items-center gap-1 py-1"
            >
              <span className={cn(moreActive || moreOpen ? "text-ink" : "text-[#14110e]/40 dark:text-[#f0ece6]/40")}>
                <IconMoreHorizontal size={20} />
              </span>
              <span className={cn("text-[10px]", moreActive || moreOpen ? "text-ink font-medium" : "text-[#14110e]/50 dark:text-[#f0ece6]/50")}>
                Mer
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
