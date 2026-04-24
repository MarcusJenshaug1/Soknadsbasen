import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrgInquiriesClient } from "./OrgInquiriesClient";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-yellow-100 text-yellow-700",
  canceled: "bg-red-100 text-red-600",
  incomplete: "bg-zinc-100 text-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøve",
  past_due: "Forfallt",
  canceled: "Kansellert",
  incomplete: "Venter",
};

export default async function AdminOrgerPage() {
  const [orgs, inquiries] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        status: true,
        stripeSubscriptionId: true,
        createdAt: true,
        _count: { select: { memberships: { where: { status: "active" } } } },
        memberships: {
          where: { role: "admin", status: "active" },
          select: { user: { select: { email: true, name: true } } },
          take: 1,
        },
      },
    }),
    prisma.orgInquiry.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orgName: true,
        contactName: true,
        contactEmail: true,
        message: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-semibold">Organisasjoner ({orgs.length})</h1>
        <Link
          href="/admin/orger/ny"
          className="px-4 py-2 rounded-full bg-ink text-bg text-[13px] font-medium hover:opacity-80 transition-opacity"
        >
          + Ny organisasjon
        </Link>
      </div>

      <OrgInquiriesClient
        initial={inquiries.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))}
      />

      <div className="border border-black/8 rounded-xl overflow-hidden divide-y divide-black/6">
        {orgs.map((o) => {
          const admin = o.memberships[0]?.user;
          return (
            <Link
              key={o.id}
              href={`/admin/orger/${o.slug}`}
              className="flex items-center gap-4 px-4 py-3 bg-bg hover:bg-black/[0.015] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center text-[11px] font-semibold text-ink/60 shrink-0">
                {o.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{o.displayName}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[12px] text-ink/40">/{o.slug}</span>
                  {admin && (
                    <span className="text-[11px] text-ink/40">
                      admin: {admin.name ? `${admin.name} (${admin.email})` : admin.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[12px] text-ink/40 tabular-nums">
                  {o._count.memberships} seter
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
            </Link>
          );
        })}
        {orgs.length === 0 && (
          <p className="px-4 py-8 text-[13px] text-ink/40 text-center">Ingen organisasjoner ennå.</p>
        )}
      </div>
    </div>
  );
}
