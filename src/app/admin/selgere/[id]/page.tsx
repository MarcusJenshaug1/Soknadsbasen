import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatNok, formatDateNb, relativeNb } from "@/lib/sales/format";
import { startOfMonth } from "@/lib/sales/format";
import { SelgerDetailClient } from "./SelgerDetailClient";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  invited: "Invitert",
  active: "Aktiv",
  suspended: "Suspendert",
};

export default async function AdminSelgerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rep = await prisma.salesRepProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!rep) notFound();

  const monthStart = startOfMonth();
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  const [orgs, payouts, sumThisMonth, sumPaidYtd, eligibleSum, pendingSum] = await Promise.all([
    prisma.organization.findMany({
      where: { salesRepId: rep.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, displayName: true, status: true, seatLimit: true, createdAt: true },
      take: 50,
    }),
    prisma.commissionPayout.findMany({
      where: { salesRepId: rep.userId },
      orderBy: { paidAt: "desc" },
      take: 20,
      include: { _count: { select: { entries: true } } },
    }),
    prisma.commissionEntry.aggregate({
      where: { salesRepId: rep.userId, paidAt: { gte: monthStart }, status: { in: ["pending", "eligible", "paid"] } },
      _sum: { invoiceAmountCents: true, amountCents: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { salesRepId: rep.userId, paidAt: { gte: yearStart }, status: "paid" },
      _sum: { amountCents: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { salesRepId: rep.userId, status: "eligible" },
      _sum: { amountCents: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { salesRepId: rep.userId, status: "pending" },
      _sum: { amountCents: true },
    }),
  ]);

  const eligible = eligibleSum._sum.amountCents ?? 0;

  return (
    <div className="space-y-5">
      <header>
        <Link href="/admin/selgere" className="text-[12px] text-ink/55 hover:text-ink">
          ← Selgere
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight">
              {rep.user.name ?? rep.user.email.split("@")[0]}
            </h1>
            <p className="text-[12px] text-ink/55 mt-0.5 font-mono">{rep.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {eligible > 0 && (
              <Link
                href={`/admin/selgere/${rep.id}/utbetal`}
                className="px-3 py-1.5 rounded-full bg-[var(--sales-commission-eligible)] text-white text-[12px] hover:opacity-90 transition-opacity"
              >
                Utbetal {formatNok(eligible, { compact: true })} →
              </Link>
            )}
            <SelgerDetailClient
              profileId={rep.id}
              status={rep.status}
              commissionRateBp={rep.commissionRateBp}
              monthlyQuotaCents={rep.monthlyQuotaCents}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="MRR mnd" value={formatNok(sumThisMonth._sum.invoiceAmountCents ?? 0, { compact: true })} />
        <Stat label="Provisjon mnd" value={formatNok(sumThisMonth._sum.amountCents ?? 0, { compact: true })} />
        <Stat label="Klar utbet." value={formatNok(eligible, { compact: true })} highlight={eligible > 0 ? "warning" : undefined} />
        <Stat label="Utbetalt i år" value={formatNok(sumPaidYtd._sum.amountCents ?? 0, { compact: true })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <section className="rounded-2xl border border-black/8 bg-surface p-5">
          <h2 className="text-[13px] font-medium mb-3">Kunder ({orgs.length})</h2>
          {orgs.length === 0 ? (
            <p className="text-[12px] text-ink/55">Ingen kunder enda.</p>
          ) : (
            <ul className="space-y-1">
              {orgs.map((o) => (
                <li key={o.id} className="flex items-center gap-2 text-[12px] py-1.5">
                  <Link href={`/admin/orger/${o.slug}`} className="flex-1 hover:underline truncate">
                    {o.displayName}
                  </Link>
                  <span className="text-[10px] text-ink/55 shrink-0">
                    {o.seatLimit} seter · {o.status}
                  </span>
                  <span className="text-[10px] text-ink/45 shrink-0">{relativeNb(o.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-black/8 bg-surface p-5">
          <h2 className="text-[13px] font-medium mb-3">Utbetalings-historikk</h2>
          {payouts.length === 0 ? (
            <p className="text-[12px] text-ink/55">Ingen utbetalinger enda.</p>
          ) : (
            <ul className="space-y-2">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-black/6 last:border-0">
                  <div className="min-w-0">
                    <div className="font-mono">{formatNok(p.totalCents)}</div>
                    {p.paymentRef && <div className="text-[10px] text-ink/55 truncate">{p.paymentRef}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-ink/55 font-mono">{formatDateNb(p.paidAt)}</div>
                    <div className="text-[10px] text-ink/45">{p._count.entries} entries</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-black/8 bg-surface p-5">
        <h2 className="text-[13px] font-medium mb-3">Innstillinger</h2>
        <dl className="text-[12px] space-y-1.5">
          <Row label="Status">{STATUS_LABEL[rep.status] ?? rep.status}</Row>
          <Row label="Provisjon-rate">{(rep.commissionRateBp / 100).toFixed(2)}%</Row>
          <Row label="Månedlig kvota">{formatNok(rep.monthlyQuotaCents)}</Row>
          <Row label="Pending provisjon">{formatNok(pendingSum._sum.amountCents ?? 0)}</Row>
          <Row label="Opprettet">{formatDateNb(rep.createdAt)}</Row>
        </dl>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "warning";
}) {
  return (
    <div
      className={
        "rounded-2xl px-3 py-3 " +
        (highlight === "warning"
          ? "bg-[var(--sales-commission-eligible)]/10"
          : "bg-black/[0.03] dark:bg-white/[0.04]")
      }
    >
      <div className="text-[11px] uppercase tracking-wide text-ink/55">{label}</div>
      <div className="text-[18px] font-semibold font-mono mt-1">{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink/55">{label}</dt>
      <dd className="font-mono">{children}</dd>
    </div>
  );
}
