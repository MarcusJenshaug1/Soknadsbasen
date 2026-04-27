import Link from "next/link";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNok, formatDateNb, relativeNb } from "@/lib/sales/format";
import { ProvisjonExport } from "./ProvisjonExport";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  eligible: "Klar",
  paid: "Utbetalt",
  clawback: "Clawback",
  voided: "Annullert",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--sales-commission-pending)",
  eligible: "var(--sales-commission-eligible)",
  paid: "var(--sales-commission-paid)",
  clawback: "var(--sales-commission-clawback)",
  voided: "var(--sales-commission-pending)",
};

const FILTERS: { id: string; label: string; statuses: string[] }[] = [
  { id: "all", label: "Alle", statuses: [] },
  { id: "pending", label: "Pending", statuses: ["pending"] },
  { id: "eligible", label: "Klare", statuses: ["eligible"] },
  { id: "paid", label: "Utbetalt", statuses: ["paid"] },
  { id: "clawback", label: "Clawback", statuses: ["clawback"] },
];

export default async function ProvisjonPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/provisjon");
  const sp = await searchParams;
  const filterId = sp.status ?? "all";
  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];

  const baseWhere = access.viewerRole === "admin" ? {} : { salesRepId: access.userId };
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  const [pending, eligible, paidYtd, clawback, entries] = await Promise.all([
    prisma.commissionEntry.aggregate({ where: { ...baseWhere, status: "pending" }, _sum: { amountCents: true } }),
    prisma.commissionEntry.aggregate({ where: { ...baseWhere, status: "eligible" }, _sum: { amountCents: true } }),
    prisma.commissionEntry.aggregate({
      where: { ...baseWhere, status: "paid", paidAt: { gte: yearStart } },
      _sum: { amountCents: true },
    }),
    prisma.commissionEntry.aggregate({ where: { ...baseWhere, status: "clawback" }, _sum: { amountCents: true } }),
    prisma.commissionEntry.findMany({
      where: {
        ...baseWhere,
        ...(filter.statuses.length > 0 ? { status: { in: filter.statuses } } : {}),
      },
      orderBy: { paidAt: "desc" },
      take: 200,
      include: {
        org: { select: { id: true, displayName: true } },
        payout: { select: { id: true, paidAt: true, paymentRef: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Provisjon</h1>
          <p className="text-[12px] text-ink/55 mt-0.5">10% av Stripe-faktura · 90 dagers clawback</p>
        </div>
        <ProvisjonExport />
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Pending"
          value={formatNok(pending._sum.amountCents ?? 0, { compact: true })}
          color="var(--sales-commission-pending)"
          tone="muted"
        />
        <SummaryCard
          label="Klar til utbetaling"
          value={formatNok(eligible._sum.amountCents ?? 0, { compact: true })}
          color="var(--sales-commission-eligible)"
          tone="warning"
        />
        <SummaryCard
          label={`Utbetalt ${new Date().getFullYear()}`}
          value={formatNok(paidYtd._sum.amountCents ?? 0, { compact: true })}
          color="var(--sales-commission-paid)"
          tone="success"
        />
        <SummaryCard
          label="Clawback"
          value={formatNok(clawback._sum.amountCents ?? 0, { compact: true })}
          color="var(--sales-commission-clawback)"
          tone="danger"
        />
      </div>

      <nav className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const active = f.id === filter.id;
          return (
            <Link
              key={f.id}
              href={`/selger/provisjon${f.id === "all" ? "" : `?status=${f.id}`}`}
              prefetch={true}
              className={
                "px-3 py-1.5 rounded-full text-[12px] transition-colors " +
                (active
                  ? "bg-ink text-bg"
                  : "bg-black/[0.04] dark:bg-white/[0.05] text-ink/65 hover:bg-black/[0.07]")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface overflow-hidden">
        {entries.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-[14px] font-medium">Ingen provisjons-entries i dette filteret</p>
            <p className="text-[12px] text-ink/55 mt-1">
              Provisjon registreres automatisk når Stripe markerer en faktura som betalt.
            </p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink/55 bg-black/[0.02] dark:bg-white/[0.03]">
                <th className="text-left px-4 py-2 font-medium">Kunde</th>
                <th className="text-left px-4 py-2 font-medium">Faktura</th>
                <th className="text-right px-4 py-2 font-medium">Beløp eks. mva</th>
                <th className="text-right px-4 py-2 font-medium">Provisjon</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Frigis</th>
                <th className="text-right px-4 py-2 font-medium">Utbetalt</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isClawback = e.status === "clawback";
                return (
                  <tr key={e.id} className="border-t border-black/6 dark:border-white/6">
                    <td className="px-4 py-2">
                      <Link href={`/selger/kunder/${e.org.id}`} prefetch={true} className="hover:underline">
                        {e.org.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-[10px] text-ink/55 truncate max-w-[120px]">{e.stripeInvoiceId}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatNok(e.invoiceAmountCents)}</td>
                    <td
                      className={
                        "px-4 py-2 text-right font-mono " +
                        (isClawback ? "text-[var(--sales-commission-clawback)]" : "")
                      }
                    >
                      {isClawback ? "−" : ""}{formatNok(e.amountCents)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px]"
                        style={{ color: STATUS_COLOR[e.status] }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[e.status] }} aria-hidden />
                        {STATUS_LABEL[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-ink/55">
                      {e.status === "pending" ? formatDateNb(e.holdUntil) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-ink/55">
                      {e.payout ? `${relativeNb(e.payout.paidAt)} · ${e.payout.paymentRef ?? ""}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  tone,
}: {
  label: string;
  value: string;
  color: string;
  tone: "muted" | "warning" | "success" | "danger";
}) {
  const bg =
    tone === "warning"
      ? "bg-[var(--sales-commission-eligible)]/10"
      : tone === "success"
        ? "bg-[var(--sales-commission-paid)]/10"
        : tone === "danger"
          ? "bg-[var(--sales-commission-clawback)]/10"
          : "bg-black/[0.03] dark:bg-white/[0.04]";
  return (
    <div className={"rounded-2xl px-3 py-3 " + bg}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden />
        {label}
      </div>
      <div className="text-[18px] font-semibold font-mono mt-1" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
