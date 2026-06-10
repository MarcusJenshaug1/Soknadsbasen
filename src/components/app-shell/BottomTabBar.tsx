"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconUser, IconMoreHorizontal } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { NotificationBell } from "./NotificationBell";
import { NAV_ITEMS, isNavActive } from "@/lib/nav";

// Profil/"Deg" og "Om" er konto-/marketing-lenker, ikke innholdsflater, så de
// holdes utenfor NAV_ITEMS men vises her.
const PROFIL_TAB = {
  href: "/app/profil",
  label: "Deg",
  icon: IconUser,
  gated: false,
};
const EXTRA_MORE = [{ href: "/om", label: "Om Marcus Jenshaug", gated: false }];

export function BottomTabBar({ hasAccess }: { hasAccess: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = NAV_ITEMS.filter((n) => n.primaryTab && (hasAccess || !n.gated));
  const tabs = [...primary, PROFIL_TAB];
  const moreItems = [
    ...NAV_ITEMS.filter((n) => !n.primaryTab && (hasAccess || !n.gated)),
    ...EXTRA_MORE,
  ];
  const moreActive = moreItems.some((i) => isNavActive(i.href, pathname));
  const cols = tabs.length + 1; // +1 for "Mer"

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] left-3 right-3 z-50 bg-bg border border-black/8 dark:border-white/8 rounded-3xl shadow-lg overflow-hidden md:hidden">
            {hasAccess && (
              <div className="px-4 pt-3 pb-2 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                <NotificationBell />
                <span className="text-[12px] text-ink/60">Varsler</span>
              </div>
            )}
            <div className="px-2 py-2 space-y-0.5">
              {moreItems.map((item) => {
                const active = isNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-2xl text-[14px] transition-colors",
                      active
                        ? "bg-ink text-bg font-medium"
                        : "text-ink hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    {"dot" in item && item.dot ? (
                      <span
                        className="size-1.5 rounded-full bg-accent shrink-0"
                        aria-hidden
                      />
                    ) : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur-md border-t border-black/8 dark:border-white/8 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] print:hidden"
        style={{
          paddingLeft: `max(1rem, env(safe-area-inset-left))`,
          paddingRight: `max(1rem, env(safe-area-inset-right))`,
        }}
        aria-label="Hovednavigasjon"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {tabs.map((t) => {
            const active = isNavActive(t.href, pathname);
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center gap-1 py-1"
                >
                  <span className={cn(active ? "text-ink" : "text-ink/40")}>
                    {Icon ? <Icon size={20} /> : null}
                  </span>
                  <span className={cn("text-[10px]", active ? "text-ink font-medium" : "text-ink/50")}>
                    {"shortLabel" in t && t.shortLabel ? t.shortLabel : t.label}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Mer-tab */}
          <li>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className="w-full flex flex-col items-center gap-1 py-1"
            >
              <span className={cn(moreActive || moreOpen ? "text-ink" : "text-ink/40")}>
                <IconMoreHorizontal size={20} />
              </span>
              <span className={cn("text-[10px]", moreActive || moreOpen ? "text-ink font-medium" : "text-ink/50")}>
                Mer
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
