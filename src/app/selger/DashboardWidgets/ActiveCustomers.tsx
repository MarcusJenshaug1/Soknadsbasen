import Link from "next/link";
import { getActiveCustomers, getChurningSoonCustomers } from "@/lib/sales/metrics";
import { WidgetShell, EmptyState } from "./WidgetShell";

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøvetid",
  past_due: "Forfalt",
  canceled: "Avsluttet",
  incomplete: "Ufullstendig",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-[var(--success)]",
  trialing: "bg-[var(--sales-stage-kontaktet)]",
  past_due: "bg-[var(--sales-commission-eligible)]",
  canceled: "bg-[var(--sales-stage-tapt)]",
  incomplete: "bg-[var(--sales-commission-pending)]",
};

export async function ActiveCustomers({ salesRepId }: { salesRepId: string }) {
  const [customers, churning] = await Promise.all([
    getActiveCustomers(salesRepId),
    getChurningSoonCustomers(salesRepId),
  ]);

  if (customers.length === 0) {
    return (
      <WidgetShell title="Mine kunder" href="/selger/kunder" cta="Se alle">
        <EmptyState
          title="Ingen kunder ennå"
          hint="Konverter en lead til org-konto eller opprett kunde direkte."
          action={{ label: "Ny kunde", href: "/selger/kunder/ny" }}
        />
      </WidgetShell>
    );
  }

  const churnIds = new Set(churning.map((c) => c.id));
  const display = customers.slice(0, 5);

  return (
    <WidgetShell title="Mine kunder" href="/selger/kunder" cta="Se alle">
      {churning.length > 0 && (
        <div className="rounded-lg bg-[var(--sales-commission-eligible)]/15 border border-[var(--sales-commission-eligible)]/30 px-3 py-2 mb-3 text-[11px]">
          <span className="font-medium">⚠ {churning.length} kunde{churning.length === 1 ? "" : "r"}</span>
          <span className="text-ink/65"> innen 90-dagers clawback-vindu.</span>
        </div>
      )}
      <ul className="space-y-1">
        {display.map((org) => (
          <li key={org.id}>
            <Link
              href={`/selger/kunder/${org.id}`}
              prefetch={true}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
            >
              <span
                className={"w-2 h-2 rounded-full shrink-0 " + (STATUS_DOT[org.status] ?? "bg-ink/30")}
                aria-hidden
              />
              <span className="flex-1 min-w-0 truncate text-[12px]">{org.displayName}</span>
              <span className="text-[10px] text-ink/55 font-mono shrink-0">
                {org.seatLimit} {org.seatLimit === 1 ? "sete" : "seter"}
              </span>
              <span
                className={
                  "text-[10px] shrink-0 " +
                  (churnIds.has(org.id) ? "text-[var(--sales-commission-eligible)]" : "text-ink/55")
                }
              >
                {STATUS_LABEL[org.status] ?? org.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {customers.length > 5 && (
        <div className="text-[11px] text-ink/45 mt-2 pt-2 border-t border-black/6 dark:border-white/6">
          + {customers.length - 5} flere
        </div>
      )}
    </WidgetShell>
  );
}
