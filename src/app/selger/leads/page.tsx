import Link from "next/link";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNok } from "@/lib/sales/format";
import { LeadsBoard } from "./LeadsBoard";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; showLost?: string }>;
}) {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/leads");
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "kanban";
  const showLost = params.showLost === "1";

  const leads = await prisma.lead.findMany({
    where: {
      ...(access.viewerRole === "admin" ? {} : { salesRepId: access.userId }),
      ...(showLost ? {} : { stage: { not: "Tapt" } }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      stage: true,
      probability: true,
      source: true,
      estimatedValueCents: true,
      expectedSeats: true,
      title: true,
      companyName: true,
      companyWebsite: true,
      orgId: true,
      closedAt: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const total = leads.reduce((s, l) => s + l.estimatedValueCents, 0);
  const open = leads.filter((l) => l.stage !== "Vunnet" && l.stage !== "Tapt");

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Leads</h1>
          <p className="text-[12px] text-ink/55 mt-0.5 font-mono">
            {leads.length} totalt · {open.length} aktive · {formatNok(total, { compact: true })} pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle current={view} showLost={showLost} />
          <Link
            href="/selger/leads/ny"
            prefetch={true}
            className="px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] hover:opacity-90 transition-opacity"
          >
            + Ny lead
          </Link>
        </div>
      </header>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface px-6 py-12 text-center">
          <p className="text-[14px] font-medium">Ingen leads ennå</p>
          <p className="text-[12px] text-ink/55 mt-1">
            Opprett din første lead manuelt eller koble på et web-skjema.
          </p>
          <Link
            href="/selger/leads/ny"
            prefetch={true}
            className="inline-block mt-4 px-3 py-1.5 rounded-full bg-ink text-bg text-[12px]"
          >
            Opprett første lead
          </Link>
        </div>
      ) : (
        <LeadsBoard leads={leads} initialView={view} />
      )}
    </div>
  );
}

function ViewToggle({ current, showLost }: { current: "kanban" | "list"; showLost: boolean }) {
  const params = (v: string, t: boolean) =>
    `?view=${v}${t ? "&showLost=1" : ""}`;
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/[0.05] dark:bg-white/[0.05] p-0.5">
      <Link
        href={`/selger/leads${params("kanban", showLost)}`}
        prefetch={true}
        className={
          "px-3 py-1 rounded-full text-[11px] transition-colors " +
          (current === "kanban" ? "bg-bg text-ink shadow-sm" : "text-ink/55 hover:text-ink")
        }
      >
        Kanban
      </Link>
      <Link
        href={`/selger/leads${params("list", showLost)}`}
        prefetch={true}
        className={
          "px-3 py-1 rounded-full text-[11px] transition-colors " +
          (current === "list" ? "bg-bg text-ink shadow-sm" : "text-ink/55 hover:text-ink")
        }
      >
        Liste
      </Link>
      <Link
        href={`/selger/leads${params(current, !showLost)}`}
        prefetch={true}
        className={
          "px-3 py-1 rounded-full text-[11px] ml-1 transition-colors " +
          (showLost ? "bg-bg text-ink shadow-sm" : "text-ink/45 hover:text-ink/70")
        }
      >
        Vis tapte
      </Link>
    </div>
  );
}
