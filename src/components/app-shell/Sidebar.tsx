"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/useAuthStore";
import { SessionSwitcher } from "@/components/sessions/SessionSwitcher";
import { NotificationBell } from "./NotificationBell";
import { PendingSuggestionsBell } from "@/components/collab/PendingSuggestionsBell";
import {
  NAV_ITEMS,
  NAV_GROUP_ORDER,
  NAV_GROUP_LABELS,
  isNavActive,
} from "@/lib/nav";
import type { OrgContext } from "@/lib/auth";

function initialsFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "?";
  return source
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function displayName(name?: string | null, email?: string | null): string {
  if (name?.trim()) return name.trim();
  if (email) return email.split("@")[0];
  return "Uinnlogget";
}

export function Sidebar({
  hasAccess,
  org,
  isInternalAdmin = false,
  isSalesRep = false,
}: {
  hasAccess: boolean;
  org: OrgContext | null;
  isInternalAdmin?: boolean;
  isSalesRep?: boolean;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const initials = initialsFor(user?.name, user?.email);
  const nav = NAV_ITEMS.filter((n) => hasAccess || !n.gated);

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 border-r border-black/8 dark:border-white/8 flex-col p-6 bg-bg h-dvh sticky top-0 print:hidden">
      <div className="mb-12">
        {org ? (
          <div className="flex items-center gap-2">
            {org.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt=""
                className="w-7 h-7 rounded-md object-contain"
              />
            )}
            <span
              className="text-[13px] font-semibold truncate"
              style={org.brandColor ? { color: org.brandColor } : undefined}
            >
              {org.displayName}
            </span>
          </div>
        ) : (
          <Logo href="/app" />
        )}
      </div>
      <nav className="space-y-0.5 text-[13px] flex-1 flex flex-col">
        <div className="flex-1 space-y-1">
          {NAV_GROUP_ORDER.map((group) => {
            const items = nav.filter((n) => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="space-y-0.5">
                {group !== "hoved" && (
                  <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] text-ink/40">
                    {NAV_GROUP_LABELS[group]}
                  </div>
                )}
                {items.map((n) => {
                  const active = isNavActive(n.href, pathname);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      prefetch={true}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-full transition-colors",
                        active
                          ? "bg-ink text-bg dark:bg-white/12 dark:text-ink"
                          : "text-ink/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink",
                      )}
                    >
                      {n.dot ? (
                        <span
                          className="size-1.5 rounded-full bg-accent shrink-0"
                          aria-hidden
                        />
                      ) : null}
                      {n.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
        {hasAccess && (
          <div className="mt-4 pt-4 border-t border-black/8 dark:border-white/8 space-y-2">
            <div className="flex items-center gap-2">
              <NotificationBell />
              <PendingSuggestionsBell />
            </div>
            <SessionSwitcher />
          </div>
        )}
        {(isInternalAdmin || isSalesRep) && (
          <div className="mt-4 pt-4 border-t border-black/8 dark:border-white/8 space-y-0.5">
            {isSalesRep && (
              <Link
                href="/selger"
                prefetch={true}
                className="block px-3 py-2 rounded-full text-[12px] text-ink/55 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Selger-CRM →
              </Link>
            )}
            {isInternalAdmin && (
              <Link
                href="/admin"
                prefetch={true}
                className="block px-3 py-2 rounded-full text-[12px] text-ink/55 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Admin →
              </Link>
            )}
          </div>
        )}
      </nav>
      <Link
        href="/app/profil"
        prefetch={true}
        className="border-t border-black/8 dark:border-white/8 pt-5 flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 rounded-full bg-panel text-[11px] font-medium flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-medium truncate">
            {displayName(user?.name, user?.email)}
          </div>
          <div className="text-[11px] text-ink/55 truncate">
            {user?.email ?? "—"}
          </div>
        </div>
      </Link>
      <a
        href="https://marcusjenshaug.no"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-2 text-[11px] text-ink/35 hover:text-ink/60 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/portrett.jpg"
          alt=""
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          className="w-4 h-4 rounded-full object-cover object-top"
        />
        <span>laget av Marcus Jenshaug</span>
      </a>
    </aside>
  );
}
