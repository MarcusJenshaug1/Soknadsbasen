import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Users, CreditCard, Settings, UserPlus, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  past_due: "Betaling mislyktes",
  canceled: "Kansellert",
  incomplete: "Venter på betaling",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-red-100 text-red-700",
  canceled: "bg-gray-200 text-gray-600",
  incomplete: "bg-yellow-100 text-yellow-700",
};

export default async function OrgDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ setup?: string; joined?: string }>;
}) {
  const { slug } = await params;
  const { setup, joined } = await searchParams;
  const session = await getSession();
  if (!session) return null;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      displayName: true,
      name: true,
      status: true,
      seatLimit: true,
      createdAt: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) notFound();

  const [activeMembers, pendingInvites, recentMembers] = await Promise.all([
    prisma.orgMembership.count({ where: { orgId: org.id, status: "active" } }),
    prisma.orgInvite.count({
      where: { orgId: org.id, expiresAt: { gt: new Date() } },
    }),
    prisma.orgMembership.findMany({
      where: { orgId: org.id, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { name: true, email: true, avatarUrl: true } },
      },
    }),
  ]);

  const isAdmin = org.memberships[0].role === "admin";
  const seatsUsed = activeMembers + pendingInvites;
  const usagePct = Math.min(100, (seatsUsed / org.seatLimit) * 100);

  return (
    <div className="space-y-8">
      {setup === "ok" && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-[13px] text-green-800">
          Organisasjonen er satt opp. Inviter brukere for å komme i gang.
        </div>
      )}
      {setup === "invoice" && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-[13px] text-blue-800">
          Organisasjonen er opprettet. Første faktura sendes på epost.
        </div>
      )}
      {joined === "ok" && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-[13px] text-green-800">
          Du er nå medlem av {org.displayName}.
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Oversikt</h1>
          <p className="text-[13px] text-ink/50 mt-0.5">
            {org.name} · opprettet{" "}
            {format(org.createdAt, "d. MMM yyyy", { locale: nb })}
          </p>
        </div>
        <span
          className={`text-[12px] px-3 py-1 rounded-full font-medium ${
            STATUS_CLASSES[org.status] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {STATUS_LABELS[org.status] ?? org.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Aktive medlemmer"
          value={activeMembers}
          icon={Users}
          href={`/org/${slug}/medlemmer`}
        />
        <StatCard
          label="Ventende invitasjoner"
          value={pendingInvites}
          icon={UserPlus}
          href={`/org/${slug}/medlemmer`}
        />
        <StatCard
          label="Lisenser brukt"
          value={`${seatsUsed} / ${org.seatLimit}`}
          icon={TrendingUp}
          href={isAdmin ? `/org/${slug}/fakturering` : `/org/${slug}/medlemmer`}
          progress={usagePct}
          progressColor={
            usagePct >= 100 ? "bg-red-500" : usagePct > 80 ? "bg-yellow-500" : "bg-ink"
          }
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-medium text-ink/70">Sist lagt til</h2>
          <Link
            href={`/org/${slug}/medlemmer`}
            prefetch
            className="text-[12px] text-ink/40 hover:text-ink transition-colors"
          >
            Se alle →
          </Link>
        </div>
        {recentMembers.length === 0 ? (
          <div className="border border-black/8 rounded-xl bg-bg p-6 text-center">
            <p className="text-[13px] text-ink/50 mb-3">Ingen medlemmer ennå</p>
            {isAdmin && (
              <Link
                href={`/org/${slug}/medlemmer`}
                className="inline-flex px-4 py-2 rounded-full bg-ink text-bg text-[13px] font-medium"
              >
                Inviter første medlem →
              </Link>
            )}
          </div>
        ) : (
          <div className="border border-black/8 rounded-xl bg-bg overflow-hidden divide-y divide-black/6">
            {recentMembers.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <Avatar name={m.user.name} email={m.user.email} url={m.user.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {m.user.name ?? m.user.email}
                  </div>
                  <div className="text-[12px] text-ink/50 truncate">{m.user.email}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {m.role === "admin" && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      Admin
                    </span>
                  )}
                  <span className="text-[12px] text-ink/30 tabular-nums">
                    {format(m.createdAt, "d. MMM", { locale: nb })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-[14px] font-medium text-ink/70 mb-3">Administrasjon</h2>
          <div className="grid grid-cols-3 gap-3">
            <ActionTile
              icon={Users}
              label="Medlemmer"
              description="Inviter og administrer brukere"
              href={`/org/${slug}/medlemmer`}
            />
            <ActionTile
              icon={CreditCard}
              label="Fakturering"
              description="Lisenser, kort og fakturaer"
              href={`/org/${slug}/fakturering`}
            />
            <ActionTile
              icon={Settings}
              label="Innstillinger"
              description="Navn, logo og farger"
              href={`/org/${slug}/innstillinger`}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  progress,
  progressColor,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  progress?: number;
  progressColor?: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="border border-black/8 rounded-xl bg-bg px-4 py-4 hover:border-black/20 transition-colors block"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-ink/40">{label}</span>
        <Icon size={14} className="text-ink/30" />
      </div>
      <div className="text-[22px] font-semibold tabular-nums">{value}</div>
      {progress !== undefined && (
        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all ${progressColor ?? "bg-ink"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Link>
  );
}

function ActionTile({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="border border-black/8 rounded-xl bg-bg p-4 hover:border-black/20 transition-colors flex flex-col gap-2"
    >
      <Icon size={16} className="text-ink/50" />
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[12px] text-ink/50 mt-0.5">{description}</div>
      </div>
    </Link>
  );
}

function initialsFor(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "?";
  return source
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({
  name,
  email,
  url,
}: {
  name: string | null;
  email: string;
  url: string | null;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-black/8 text-ink/60 text-[11px] font-semibold flex items-center justify-center shrink-0">
      {initialsFor(name, email)}
    </div>
  );
}
