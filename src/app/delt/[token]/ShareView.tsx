"use client";

import { Logo } from "@/components/ui/Logo";
import { StatusDot, STATUS_LABEL, type StatusKey } from "@/components/ui/StatusDot";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

type App = {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  title: string;
  status: string;
  applicationDate: string | null;
  source: string | null;
  session: { name: string; status: string } | null;
};

type Session = {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  closedAt: string | null;
  _count: { applications: number };
};

const STATUS_ORDER: StatusKey[] = [
  "interview", "offer", "accepted", "applied", "draft", "rejected", "withdrawn",
];

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export function ShareView({
  firstName,
  applications,
  sessions,
  expiresAt,
}: {
  firstName: string;
  applications: App[];
  sessions: Session[];
  expiresAt: string;
}) {
  const byStatus = STATUS_ORDER.reduce<Record<string, App[]>>((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s);
    return acc;
  }, {});

  const activeSession = sessions.find((s) => s.status === "ACTIVE");
  const totalApps = applications.length;
  const activeApps = applications.filter((a) => !["rejected", "withdrawn", "draft"].includes(a.status)).length;
  const inInterview = applications.filter((a) => ["interview", "offer", "accepted"].includes(a.status)).length;

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Header */}
      <header className="border-b border-black/8 dark:border-white/8 px-5 py-4 flex items-center justify-between max-w-[1100px] mx-auto">
        <Logo href="/" />
        <span className="text-[12px] text-[#14110e]/50 dark:text-[#f0ece6]/50">
          Utløper {formatDate(expiresAt)}
        </span>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 md:px-10 py-8 md:py-12">
        {/* Title */}
        <div className="mb-10">
          <p className="text-[13px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-2 uppercase tracking-widest">
            Delt av
          </p>
          <h1 className="text-[36px] md:text-[48px] font-medium leading-none tracking-[-0.03em]">
            {firstName} sin jobbsøking
          </h1>
          {activeSession && (
            <p className="text-[14px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mt-3">
              Aktiv sesjon: <span className="font-medium text-ink">{activeSession.name}</span>
              {" · "}startet {formatDate(activeSession.startedAt)}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10 max-w-sm">
          {[
            { label: "Totalt", val: totalApps },
            { label: "Aktive", val: activeApps },
            { label: "Intervju / tilbud", val: inInterview },
          ].map(({ label, val }) => (
            <div key={label} className="bg-surface border border-black/5 dark:border-white/5 rounded-2xl p-4 text-center">
              <div className="text-[28px] font-medium leading-none">{val}</div>
              <div className="text-[11px] text-[#14110e]/50 dark:text-[#f0ece6]/50 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Applications grouped by status */}
        {applications.length === 0 ? (
          <p className="text-[14px] text-[#14110e]/50 dark:text-[#f0ece6]/50">Ingen søknader ennå.</p>
        ) : (
          <div className="space-y-8">
            {STATUS_ORDER.map((status) => {
              const apps = byStatus[status];
              if (!apps?.length) return null;
              return (
                <section key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <StatusDot status={status} />
                    <h2 className="text-[13px] font-medium">
                      {STATUS_LABEL[status]}
                    </h2>
                    <span className="text-[11px] text-[#14110e]/40 dark:text-[#f0ece6]/40">
                      ({apps.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {apps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-surface border border-black/5 dark:border-white/5 rounded-2xl p-4 flex items-center gap-3"
                      >
                        <CompanyLogo website={app.companyWebsite} name={app.companyName} size="sm" className="rounded-lg shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium truncate">{app.companyName}</div>
                          <div className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 truncate">{app.title}</div>
                          {app.applicationDate && (
                            <div className="text-[10px] text-[#14110e]/40 dark:text-[#f0ece6]/40 mt-0.5">
                              {formatDate(app.applicationDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/8 dark:border-white/8 mt-16 px-5 py-6 text-center">
        <p className="text-[12px] text-[#14110e]/40 dark:text-[#f0ece6]/40">
          Laget med{" "}
          <a href="/" className="hover:text-accent transition-colors">
            Søknadsbasen
          </a>{" "}
          — jobbsøking med ro
        </p>
      </footer>
    </div>
  );
}
