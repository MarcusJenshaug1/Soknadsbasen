import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Building2, Users, Tag, Inbox, LayoutDashboard } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Oversikt", icon: LayoutDashboard, exact: true },
  { href: "/admin/orger", label: "Organisasjoner", icon: Building2 },
  { href: "/admin/brukere", label: "Brukere", icon: Users },
  { href: "/admin/promo", label: "Rabattkoder", icon: Tag },
  { href: "/admin/innboks", label: "Innboks", icon: Inbox },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.email !== process.env.ADMIN_EMAIL) {
    redirect("/logg-inn");
  }

  return (
    <div className="min-h-dvh bg-[#f9f9f8] flex">
      <aside className="w-[220px] shrink-0 border-r border-black/8 flex flex-col bg-bg">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-black/6">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="" className="w-6 h-6 shrink-0" />
            <span className="text-[13px] font-semibold">Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-ink/60 hover:text-ink hover:bg-black/5 transition-colors group"
            >
              <Icon size={15} className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-black/6">
          <Link
            href="/app"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-ink/40 hover:text-ink hover:bg-black/5 transition-colors"
          >
            ← Tilbake til appen
          </Link>
          <div className="px-3 mt-2">
            <p className="text-[11px] text-ink/30 truncate">{session.email}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
