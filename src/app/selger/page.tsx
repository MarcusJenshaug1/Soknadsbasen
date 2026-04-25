import { getSalesRepSession } from "@/lib/auth";

export default async function SelgerHome() {
  const session = await getSalesRepSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">
          Hei, {session?.name?.split(" ")[0] ?? "selger"} 👋
        </h1>
        <p className="text-[13px] text-ink/60 mt-1">
          Velkommen til selger-CRM-et. Dashbord med widgets kommer i Fase 2.
        </p>
      </header>

      <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-6">
        <h2 className="text-[14px] font-medium mb-3">Fase 1 — fundament klart</h2>
        <ul className="text-[13px] text-ink/70 space-y-1.5 list-disc pl-5">
          <li>Plattform-rolle <code className="font-mono text-[12px]">selger</code> registrert i schema</li>
          <li>Provisjons-tabeller (CommissionEntry, CommissionPayout) klare</li>
          <li>Lead/CRM-modeller (Lead, CrmContact, CrmActivity) klare</li>
          <li>Auth utvidet — selgere får full Pro-tilgang uten subscription</li>
          <li>/selger-rute beskyttet av <code className="font-mono text-[12px]">getSalesRepSession()</code></li>
        </ul>
        <p className="text-[12px] text-ink/50 mt-4">
          Neste fase: dashboard-widgets (MRR-progress, leaderboard, pipeline-verdi, oppgaver).
        </p>
      </section>
    </div>
  );
}
