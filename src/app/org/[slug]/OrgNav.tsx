"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, Settings } from "lucide-react";

export function OrgNav({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const base = `/org/${slug}`;

  const items = [
    { href: base, label: "Oversikt", icon: LayoutDashboard, exact: true },
    { href: `${base}/medlemmer`, label: "Medlemmer", icon: Users },
    ...(isAdmin
      ? [
          { href: `${base}/fakturering`, label: "Fakturering", icon: CreditCard },
          { href: `${base}/innstillinger`, label: "Innstillinger", icon: Settings },
        ]
      : []),
  ];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
              active
                ? "bg-black/5 text-ink font-medium"
                : "text-ink/60 hover:text-ink hover:bg-black/5"
            }`}
          >
            <Icon
              size={15}
              className={`shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
