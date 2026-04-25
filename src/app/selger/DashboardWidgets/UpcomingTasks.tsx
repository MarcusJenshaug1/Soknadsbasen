import Link from "next/link";
import { getUpcomingTasks } from "@/lib/sales/metrics";
import { formatDueAt } from "@/lib/sales/format";
import { WidgetShell, EmptyState } from "./WidgetShell";

export async function UpcomingTasks({ salesRepId }: { salesRepId: string }) {
  const tasks = await getUpcomingTasks(salesRepId);

  if (tasks.length === 0) {
    return (
      <WidgetShell title="Oppgaver" href="/selger/leads" cta="Til leads">
        <EmptyState title="Ingen forfallende oppgaver" hint="Logg en oppgave på en lead for å holde oversikt." />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Oppgaver i dag" href="/selger/leads" cta="Alle leads">
      <ul className="space-y-1">
        {tasks.map((t) => {
          const due = formatDueAt(t.dueAt);
          return (
            <li key={t.id}>
              <Link
                href={`/selger/leads/${t.lead.id}`}
                prefetch={true}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
              >
                <span
                  className={
                    "w-2 h-2 rounded-full shrink-0 " +
                    (due.overdue ? "bg-[var(--sales-stage-tapt)]" : "bg-[var(--sales-stage-forhandling)]")
                  }
                  aria-hidden
                />
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[12px]">{t.title ?? "(uten tittel)"}</span>
                  <span className="block truncate text-[11px] text-ink/50">{t.lead.companyName}</span>
                </span>
                <span
                  className={
                    "text-[10px] font-mono shrink-0 " +
                    (due.overdue ? "text-[var(--sales-stage-tapt)]" : "text-ink/55")
                  }
                >
                  {due.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
