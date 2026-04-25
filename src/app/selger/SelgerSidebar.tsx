"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiTrendingUp,
  FiUsers,
  FiDollarSign,
  FiAward,
  FiCode,
} from "react-icons/fi";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof FiHome;
  exact?: boolean;
};

const NAV: readonly NavItem[] = [
  { href: "/selger",                label: "Hjem",        icon: FiHome,        exact: true },
  { href: "/selger/leads",          label: "Leads",       icon: FiTrendingUp },
  { href: "/selger/kunder",         label: "Kunder",      icon: FiUsers },
  { href: "/selger/provisjon",      label: "Provisjon",   icon: FiDollarSign },
  { href: "/selger/leaderboard",    label: "Leaderboard", icon: FiAward },
  { href: "/selger/web-form-embed", label: "Web-skjema",  icon: FiCode },
];

export function SelgerSidebar({
  email,
  viewerRole,
}: {
  email: string;
  viewerRole: "selger" | "admin";
}) {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] shrink-0 border-r border-black/8 dark:border-white/8 flex flex-col bg-bg h-dvh sticky top-0">
      <div className="px-5 py-5 border-b border-black/6 dark:border-white/6">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" className="w-6 h-6 shrink-0" />
          <span className="text-[13px] font-semibold">Selger</span>
          {viewerRole === "admin" && (
            <span className="ml-auto text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--sales-stage-kontaktet)]/15 text-[var(--sales-stage-kontaktet)]">
              admin
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors group",
                active
                  ? "bg-ink text-bg dark:bg-white/12 dark:text-ink"
                  : "text-ink/60 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0 transition-opacity",
                  active ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-black/6 dark:border-white/6">
        <Link
          href="/app"
          prefetch={true}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-ink/40 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          ← Tilbake til appen
        </Link>
        <div className="px-3 mt-2">
          <p className="text-[11px] text-ink/30 truncate">{email}</p>
        </div>
      </div>
    </aside>
  );
}
