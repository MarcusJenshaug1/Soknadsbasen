import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminOrgStatusEditor, AdminOrgBrandingEditor } from "./AdminOrgClient";

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, role: true, status: true, sharesDataWithOrg: true, createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });
  if (!org) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/orger" className="text-[13px] text-ink/50 hover:text-ink">← Organisasjoner</Link>
      </div>
      <h1 className="text-[22px] font-semibold mb-1">{org.displayName}</h1>
      <p className="text-[13px] text-ink/50 mb-8">{org.name} · /{org.slug}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-black/8 p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1">Stripe Customer</div>
          <div className="text-[13px] font-mono truncate">{org.stripeCustomerId ?? "—"}</div>
        </div>
        <div className="rounded-2xl border border-black/8 p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1">Stripe Sub</div>
          <div className="text-[13px] font-mono truncate">{org.stripeSubscriptionId ?? "—"}</div>
        </div>
      </div>

      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-3">Status override</div>
        <AdminOrgStatusEditor slug={slug} current={org.status} />
      </div>

      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-3">Whitelabeling</div>
        <AdminOrgBrandingEditor
          slug={slug}
          currentLogoUrl={org.logoUrl}
          currentBrandColor={org.brandColor}
        />
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-3">
          Medlemmer ({org.memberships.length})
        </div>
        <div className="space-y-2">
          {org.memberships.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-black/8 p-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{m.user.name ?? m.user.email}</div>
                <div className="text-[12px] text-ink/50">{m.user.email}</div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-panel text-ink/60">{m.role}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                m.status === "active" ? "bg-green-100 text-green-700" :
                m.status === "invited" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-600"
              }`}>{m.status}</span>
              {m.sharesDataWithOrg && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">deler data</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
