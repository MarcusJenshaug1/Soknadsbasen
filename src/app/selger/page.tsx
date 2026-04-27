import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import {
  getActiveCustomerCount,
  getCommissionSummary,
  getPipelineByStage,
  getSalesRepCommissionThisMonth,
  getSalesRepMrrThisMonth,
} from "@/lib/sales/metrics";
import { formatNok } from "@/lib/sales/format";
import { KpiCard, KpiSkeleton } from "./DashboardWidgets/KpiCard";
import { WidgetSkeleton } from "./DashboardWidgets/WidgetShell";
import { MrrProgress } from "./DashboardWidgets/MrrProgress";
import { Leaderboard } from "./DashboardWidgets/Leaderboard";
import { PipelineValue } from "./DashboardWidgets/PipelineValue";
import { ActiveCustomers } from "./DashboardWidgets/ActiveCustomers";
import { UpcomingTasks } from "./DashboardWidgets/UpcomingTasks";

export const dynamic = "force-dynamic";

export default async function SelgerDashboard() {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger");
  const salesRepId = access.userId;
  const quotaCents = access.salesRep.monthlyQuotaCents;
  const firstName = access.name?.split(" ")[0] ?? (access.viewerRole === "admin" ? "admin" : "selger");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Hei, {firstName} 👋</h1>
        <p className="text-[13px] text-ink/60 mt-1">
          Oversikt over salget ditt, pipeline og provisjon.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Suspense fallback={<KpiSkeleton />}>
          <MrrKpi salesRepId={salesRepId} />
        </Suspense>
        <Suspense fallback={<KpiSkeleton />}>
          <CustomersKpi salesRepId={salesRepId} />
        </Suspense>
        <Suspense fallback={<KpiSkeleton />}>
          <CommissionKpi salesRepId={salesRepId} />
        </Suspense>
        <Suspense fallback={<KpiSkeleton />}>
          <PipelineKpi salesRepId={salesRepId} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<WidgetSkeleton />}>
          <MrrProgress salesRepId={salesRepId} quotaCents={quotaCents} />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <Leaderboard currentUserId={salesRepId} />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <PipelineValue salesRepId={salesRepId} />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <ActiveCustomers salesRepId={salesRepId} />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <UpcomingTasks salesRepId={salesRepId} />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <CommissionStatus salesRepId={salesRepId} />
        </Suspense>
      </div>
    </div>
  );
}

async function MrrKpi({ salesRepId }: { salesRepId: string }) {
  const mrr = await getSalesRepMrrThisMonth(salesRepId);
  return <KpiCard label="Min MRR i mnd" value={formatNok(mrr, { compact: true })} />;
}

async function CustomersKpi({ salesRepId }: { salesRepId: string }) {
  const count = await getActiveCustomerCount(salesRepId);
  return (
    <KpiCard
      label="Aktive kunder"
      value={String(count)}
      hint={count === 0 ? "Ingen ennå" : undefined}
    />
  );
}

async function CommissionKpi({ salesRepId }: { salesRepId: string }) {
  const c = await getSalesRepCommissionThisMonth(salesRepId);
  return <KpiCard label="Provisjon i mnd" value={formatNok(c, { compact: true })} />;
}

async function PipelineKpi({ salesRepId }: { salesRepId: string }) {
  const rows = await getPipelineByStage(salesRepId);
  const open = rows
    .filter((r) => r.stage !== "Vunnet" && r.stage !== "Tapt")
    .reduce((sum, r) => sum + r.valueCents, 0);
  return <KpiCard label="Pipeline-verdi" value={formatNok(open, { compact: true })} />;
}

async function CommissionStatus({ salesRepId }: { salesRepId: string }) {
  const sum = await getCommissionSummary(salesRepId);
  return (
    <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-medium tracking-tight">Provisjon-status</h2>
        <a
          href="/selger/provisjon"
          className="text-[11px] text-ink/55 hover:text-ink transition-colors"
        >
          Se alle →
        </a>
      </header>
      <dl className="grid grid-cols-2 gap-3">
        <Cell label="Pending" value={formatNok(sum.pendingCents, { compact: true })} color="var(--sales-commission-pending)" />
        <Cell label="Klar til utbet." value={formatNok(sum.eligibleCents, { compact: true })} color="var(--sales-commission-eligible)" />
        <Cell label="Utbetalt i år" value={formatNok(sum.paidYtdCents, { compact: true })} color="var(--sales-commission-paid)" />
        <Cell label="Clawback" value={formatNok(sum.clawbackCents, { compact: true })} color="var(--sales-commission-clawback)" />
      </dl>
    </section>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink/55">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden />
        {label}
      </div>
      <div className="text-[16px] font-semibold font-mono mt-1">{value}</div>
    </div>
  );
}
