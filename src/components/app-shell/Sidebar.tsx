"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/useAuthStore";

type NavItem = { href: string; label: string; gated: boolean };

const NAV: readonly NavItem[] = [
  { href: "/app", label: "Hjem", gated: true },
  { href: "/app/cv", label: "Min CV", gated: true },
  { href: "/app/pipeline", label: "Søknader", gated: true },
  { href: "/app/brev", label: "Søknadsbrev", gated: true },
  { href: "/app/oppgaver", label: "Oppgaver", gated: true },
  { href: "/app/selskaper", label: "Selskaper", gated: true },
  { href: "/app/innsikt", label: "Innsikt", gated: true },
  { href: "/app/profil", label: "Profil", gated: false },
  { href: "/app/billing", label: "Abonnement", gated: false },
] as const;

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

export function Sidebar({ hasAccess }: { hasAccess: boolean }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const initials = initialsFor(user?.name, user?.email);
  const nav = NAV.filter((n) => hasAccess || !n.gated);

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 border-r border-black/8 flex-col p-6 bg-[#faf8f5] h-dvh sticky top-0 print:hidden">
      <div className="mb-12">
        <Logo href="/app" />
      </div>
      <nav className="space-y-0.5 text-[13px] flex-1">
        {nav.map((n) => {
          const active =
            n.href === "/app"
              ? pathname === "/app"
              : pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "block px-3 py-2 rounded-full transition-colors",
                active
                  ? "bg-[#14110e] text-[#faf8f5]"
                  : "text-[#14110e]/70 hover:bg-black/5 hover:text-[#14110e]",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/app/profil"
        className="border-t border-black/8 pt-5 flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 rounded-full bg-[#eee9df] text-[11px] font-medium flex items-center justify-center overflow-hidden shrink-0">
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
          <div className="text-[11px] text-[#14110e]/55 truncate">
            {user?.email ?? "—"}
          </div>
        </div>
      </Link>
    </aside>
  );
}
