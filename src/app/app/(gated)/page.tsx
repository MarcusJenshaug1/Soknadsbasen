import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Flag, Phone, Plus } from "lucide-react";
import { getSessionWithAccess } from "@/lib/auth";
import { getActiveSession } from "@/lib/session-context";
import { prisma } from "@/lib/prisma";
import { SectionLabel } from "@/components/ui/Pill";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { PIPELINE_COLUMNS, PIPELINE_STATUSES } from "@/lib/pipeline";
import { GoalWidget } from "./GoalWidget";
import { CvModule } from "./CvModule";

export const dynamic = "force-dynamic";

type Application = {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  title: string;
  status: string;
  statusUpdatedAt: Date;
  applicationDate: Date | null;
  interviewAt: Date | null;
  deadlineAt: Date | null;
  followUpAt: Date | null;
  createdAt: Date;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 10) return "God morgen";
  if (h < 17) return "God dag";
  return "God kveld";
}

function dateLabel(d: Date) {
  return d.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function daysUntil(d: Date) {
  return Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function firstName(full: string | null): string {
  return full?.trim().split(/\s+/)[0] ?? "";
}

function pickNextMilestone(apps: Application[]) {
  const now = Date.now();
  const soonest = apps
    .flatMap((a) => {
      const events: {
        app: Application;
        at: Date;
        kind: "interview" | "deadline";
      }[] = [];
      if (a.interviewAt) events.push({ app: a, at: a.interviewAt, kind: "interview" });
      if (a.deadlineAt) events.push({ app: a, at: a.deadlineAt, kind: "deadline" });
      return events;
    })
    .filter((e) => e.at.getTime() >= now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  return soonest ?? null;
}

type ActionKind = "interview" | "deadline" | "followUp";

type ActionItem = {
  app: Application;
  at: Date;
  kind: ActionKind;
  /** Negative = overdue (i fortiden). */
  days: number;
};

/**
 * Utleder en handlingsliste fra app-objektene vi allerede har hentet (ingen
 * ekstra DB-kall). Tar med forfalte oppfølginger ("krever oppmerksomhet") og
 * alt med frist/intervju/oppfølging innen 14 dager fram i tid. Sortert med
 * det mest presserende først (forfalt øverst, deretter nærmest i tid).
 */
function buildActionItems(apps: Application[], limit = 5): ActionItem[] {
  const now = Date.now();
  const horizon = now + 14 * 86_400_000;

  const items: ActionItem[] = [];
  for (const a of apps) {
    const candidates: { at: Date | null; kind: ActionKind }[] = [
      { at: a.interviewAt, kind: "interview" },
      { at: a.deadlineAt, kind: "deadline" },
      { at: a.followUpAt, kind: "followUp" },
    ];
    for (const c of candidates) {
      if (!c.at) continue;
      const t = c.at.getTime();
      // Forfalte oppfølginger er handlingsverdige; forfalte frister/intervjuer
      // er ikke lenger noe brukeren kan rekke, så de hoppes over.
      const isOverdue = t < now;
      if (isOverdue && c.kind !== "followUp") continue;
      if (!isOverdue && t > horizon) continue;
      items.push({ app: a, at: c.at, kind: c.kind, days: daysUntil(c.at) });
    }
  }

  return items.sort((x, y) => x.at.getTime() - y.at.getTime()).slice(0, limit);
}

/**
 * CV-data lagres i en wrapper-payload (ResumePayloadV2 eller V1).
 * Pakker ut riktig ResumeData-objekt og teller fylte seksjoner.
 */
function computeCvPercent(userDataResume: string | null | undefined): number {
  if (!userDataResume) return 0;
  try {
    const outer = JSON.parse(userDataResume) as Record<string, unknown>;
    if (!outer || typeof outer !== "object") return 0;

    let data: Record<string, unknown> | null = null;

    // v2 payload: { resumes, activeResumeId, _resumeDataMap, data }
    if (
      "_resumeDataMap" in outer &&
      outer._resumeDataMap &&
      typeof outer._resumeDataMap === "object"
    ) {
      const activeId =
        typeof outer.activeResumeId === "string" ? outer.activeResumeId : null;
      const map = outer._resumeDataMap as Record<string, unknown>;
      const active = activeId ? map[activeId] : null;
      if (active && typeof active === "object") {
        data = active as Record<string, unknown>;
      }
    }

    // v1 payload: { data: ResumeData }
    if (!data && "data" in outer && outer.data && typeof outer.data === "object") {
      data = outer.data as Record<string, unknown>;
    }

    // Fallback: rå ResumeData direkte
    if (!data) data = outer;

    const contact = data.contact as Record<string, unknown> | undefined;
    const contactFilled =
      !!contact &&
      Object.values(contact).some(
        (v) => typeof v === "string" && v.trim().length > 0,
      );
    const hasText = (k: string) => {
      const v = data![k];
      return typeof v === "string" && v.trim().length > 0;
    };
    const hasArray = (k: string) => {
      const v = data![k];
      return Array.isArray(v) && v.length > 0;
    };

    const checks: boolean[] = [
      contactFilled,
      hasText("role"),
      hasText("summary"),
      hasArray("experience"),
      hasArray("education"),
      hasArray("skills"),
      hasArray("languages"),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  } catch {
    return 0;
  }
}

export default async function AppHomePage() {
  // Layoutet har allerede kjørt getSessionWithAccess + redirect — vi treffer
  // cache her. Henter aktiv sesjon parallelt (også cached fra layout).
  const [session, activeJobSession] = await Promise.all([
    getSessionWithAccess(),
    getActiveSession(),
  ]);
  if (!session) redirect("/logg-inn");

  const weekStart = new Date(Date.now() - 7 * 86_400_000);

  const [allApps, userData, userProfile] = await Promise.all([
    prisma.jobApplication.findMany({
      where: {
        userId: session.userId,
        archivedAt: null,
        ...(activeJobSession ? { sessionId: activeJobSession.id } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        companyName: true,
        companyWebsite: true,
        title: true,
        status: true,
        statusUpdatedAt: true,
        applicationDate: true,
        interviewAt: true,
        deadlineAt: true,
        followUpAt: true,
        createdAt: true,
      },
    }),
    prisma.userData.findUnique({
      where: { userId: session.userId },
      select: { resumeData: true },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { weeklyGoal: true },
    }),
  ]);
  const apps = allApps;
  const thisWeekSent = apps.filter(
    (a) => a.status !== "draft" && a.createdAt >= weekStart,
  ).length;

  const TERMINAL = ["accepted", "declined", "rejected", "withdrawn"] as const;
  const active = apps.filter(
    (a) => !(TERMINAL as readonly string[]).includes(a.status),
  );
  const interviewCount = apps.filter((a) => a.status === "interview").length;
  const acceptedCount = apps.filter((a) => a.status === "accepted").length;
  const declinedCount = apps.filter((a) => a.status === "declined").length;
  const rejectedCount = apps.filter((a) => a.status === "rejected").length;

  const milestone = pickNextMilestone(active);
  const actionItems = buildActionItems(active);
  const cvPercent = computeCvPercent(userData?.resumeData ?? null);

  const oldestActive = active.reduce<Date | null>(
    (min, a) => (min && min < a.createdAt ? min : a.createdAt),
    null,
  );
  const daysRunning = oldestActive
    ? Math.max(1, Math.round((Date.now() - oldestActive.getTime()) / 86_400_000))
    : 0;

  // Svar = alle statuser der arbeidsgiver har respondert eller prosessen
  // er avsluttet etter vurdering. Inkluderer: intervju, tilbud, takket ja,
  // takket nei, avslag. Breakdown per type vises i Resultater-seksjonen.
  const RESPONDED = [
    "interview",
    "offer",
    "accepted",
    "declined",
    "rejected",
  ] as const;
  const respondedCount = apps.filter((a) =>
    (RESPONDED as readonly string[]).includes(a.status),
  ).length;
  const sentCount = apps.filter((a) => a.status !== "draft").length;
  const responseRate = sentCount > 0 ? Math.round((respondedCount / sentCount) * 100) : 0;

  const pipelinePreviewCols = PIPELINE_COLUMNS.slice(0, 4);
  const byStatus = Object.fromEntries(
    PIPELINE_STATUSES.map((s) => [s, apps.filter((a) => a.status === s)]),
  );

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-12 py-6 md:py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-12">
        <div>
          <SectionLabel className="mb-3 capitalize">
            {dateLabel(new Date())}
          </SectionLabel>
          <h1 className="text-[32px] md:text-[44px] leading-[1] tracking-[-0.03em] font-medium">
            {greeting()}
            {firstName(session.name) ? `, ${firstName(session.name)}` : ""}.
          </h1>
          <p className="text-[14px] md:text-[15px] text-[#14110e]/65 dark:text-[#f0ece6]/65 mt-3">
            {active.length} aktive søknader · {interviewCount} intervjuer
            {activeJobSession && (
              <span className="ml-2 text-[13px] text-[#14110e]/40 dark:text-[#f0ece6]/40">
                · {activeJobSession.name}
              </span>
            )}
          </p>
          <div className="mt-3">
            <GoalWidget
              thisWeekSent={thisWeekSent}
              initialGoal={userProfile?.weeklyGoal ?? null}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/pipeline"
            className="px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            Ny søknad
          </Link>
          <Link
            href="/app/cv"
            className="px-5 py-2.5 rounded-full border border-black/15 dark:border-white/15 text-[13px] hover:border-black/30 dark:hover:border-white/30 transition-colors"
          >
            Rediger CV
          </Link>
        </div>
      </div>

      {/* Milestone hero */}
      <MilestoneCard
        milestone={milestone}
        firstName={firstName(session.name)}
      />

      {/* Krever oppmerksomhet / Denne uken */}
      {actionItems.length > 0 && (
        <ActionList items={actionItems} />
      )}

      {/* CV-fullføring: kun en handlings-nudge når CV ikke er ferdig.
          Den fulle CV-statusen (CV-er, lenker, sist redigert) eier CvModule
          lenger ned, så vi unngår å vise to overlappende CV-kort. */}
      {cvPercent < 100 && (
        <CvNudge percent={cvPercent} />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 md:mt-6">
        <StatCard label="Aktive søknader" value={String(active.length)} />
        <StatCard
          label="Svarprosent"
          value={`${responseRate}%`}
          sub={sentCount > 0 ? `av ${sentCount} sendt` : undefined}
        />
        <StatCard
          label="Dager pågående"
          value={daysRunning > 0 ? String(daysRunning) : "—"}
          sub="siden start"
        />
        <StatCard
          label="Intervjuer"
          value={String(interviewCount)}
          sub="akkurat nå"
        />
      </div>

      {/* Resultater */}
      {acceptedCount + declinedCount + rejectedCount > 0 && (
        <div className="mt-6 md:mt-8">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <SectionLabel className="mb-2">Resultater</SectionLabel>
              <h2 className="text-[22px] md:text-[24px] tracking-tight font-medium">
                Avsluttede søknader
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ResultCard
              label="Takket ja"
              value={acceptedCount}
              tone="positive"
            />
            <ResultCard
              label="Takket nei"
              value={declinedCount}
              tone="neutral"
            />
            <ResultCard
              label="Avslag"
              value={rejectedCount}
              tone="muted"
            />
          </div>
        </div>
      )}

      {/* CV-modul */}
      <CvModule userId={session.userId} />

      {/* Pipeline preview */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <SectionLabel className="mb-2">Pipeline</SectionLabel>
            <h2 className="text-[22px] md:text-[24px] tracking-tight font-medium">
              Dine aktive søknader
            </h2>
          </div>
          <Link
            href="/app/pipeline"
            className="text-[13px] text-accent hover:text-ink"
          >
            Se alle {apps.length} →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {pipelinePreviewCols.map((col) => {
            const items = byStatus[col.status] ?? [];
            return (
              <div
                key={col.status}
                className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: col.dotColor }}
                    />
                    <span className="text-[12px] font-medium">{col.label}</span>
                  </div>
                  <span className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45">
                    {items.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {items.slice(0, 3).map((a) => (
                    <PrefetchLink
                      key={a.id}
                      href={`/app/pipeline/${a.id}`}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-bg hover:bg-panel transition-colors"
                    >
                      <CompanyLogo
                        website={a.companyWebsite}
                        name={a.companyName}
                        size="sm"
                        className="w-8 h-8 rounded-lg"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium leading-tight truncate">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mt-0.5 truncate">
                          {a.companyName}
                        </div>
                      </div>
                    </PrefetchLink>
                  ))}
                  {items.length === 0 && (
                    <div className="text-[11px] text-[#14110e]/40 dark:text-[#f0ece6]/40 text-center py-6">
                      Tom
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MilestoneCard({
  milestone,
  firstName,
}: {
  milestone: ReturnType<typeof pickNextMilestone>;
  firstName: string;
}) {
  if (!milestone) {
    return (
      <div className="bg-ink text-bg rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <SectionLabel tone="accent" className="mb-4">
          Neste milepæl
        </SectionLabel>
        <h2 className="text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] font-medium mb-4">
          Ingen kommende hendelser.
        </h2>
        <p className="text-[14px] md:text-[15px] text-bg/65 leading-relaxed mb-6 max-w-xl">
          {firstName ? `${firstName}, l` : "L"}egg til en intervju-dato eller
          søknadsfrist på en av søknadene for å få en oversikt her.
        </p>
        <Link
          href="/app/pipeline"
          className="inline-flex px-5 py-2.5 rounded-full bg-bg text-ink text-[13px] font-medium hover:bg-surface"
        >
          Åpne pipeline
        </Link>
      </div>
    );
  }

  const days = daysUntil(milestone.at);
  const kindText =
    milestone.kind === "interview" ? "Intervju" : "Søknadsfrist";
  const timeText = milestone.at.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-ink text-bg rounded-3xl p-8 md:p-10 relative overflow-hidden">
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-xl">
          <SectionLabel tone="accent" className="mb-4">
            Neste milepæl
          </SectionLabel>
          <h2 className="text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] font-medium mb-4">
            {kindText} hos {milestone.app.companyName}
          </h2>
          <p className="text-[14px] md:text-[15px] text-bg/65 leading-relaxed mb-6">
            {timeText}. {milestone.app.title}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/app/pipeline/${milestone.app.id}`}
              className="px-5 py-2.5 rounded-full bg-bg text-ink text-[13px] font-medium hover:bg-surface"
            >
              Åpne søknaden
            </Link>
            <Link
              href="/app/pipeline"
              className="px-5 py-2.5 rounded-full border border-bg/20 text-[13px] hover:border-bg/40"
            >
              Se pipeline
            </Link>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[56px] md:text-[80px] leading-none tracking-[-0.04em] font-medium">
            {days}
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-bg/50 mt-1">
            {days === 1 ? "dag igjen" : "dager igjen"}
          </div>
        </div>
      </div>
    </div>
  );
}

function actionMeta(kind: ActionKind): {
  Icon: typeof CalendarClock;
  verb: string;
} {
  switch (kind) {
    case "interview":
      return { Icon: CalendarClock, verb: "Intervju" };
    case "deadline":
      return { Icon: Flag, verb: "Søknadsfrist" };
    case "followUp":
      return { Icon: Phone, verb: "Følg opp" };
  }
}

function relativeDays(days: number): { text: string; overdue: boolean } {
  if (days < 0) {
    const n = Math.abs(days);
    return { text: n === 1 ? "1 dag forsinket" : `${n} dager forsinket`, overdue: true };
  }
  if (days === 0) return { text: "i dag", overdue: false };
  if (days === 1) return { text: "i morgen", overdue: false };
  return { text: `om ${days} dager`, overdue: false };
}

function ActionList({ items }: { items: ActionItem[] }) {
  return (
    <section className="mt-4 md:mt-6 bg-surface rounded-3xl border border-black/5 dark:border-white/5 p-6 md:p-8">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div>
          <SectionLabel className="mb-2">Krever oppmerksomhet</SectionLabel>
          <h2 className="text-[22px] md:text-[24px] tracking-tight font-medium">
            Denne uken
          </h2>
        </div>
        <Link href="/app/pipeline" className="text-[13px] text-accent hover:text-ink">
          Se alle →
        </Link>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => {
          const { Icon, verb } = actionMeta(item.kind);
          const { text, overdue } = relativeDays(item.days);
          return (
            <li key={`${item.app.id}-${item.kind}`}>
              <PrefetchLink
                href={`/app/pipeline/${item.app.id}`}
                className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-panel transition-colors"
              >
                <span
                  className={
                    overdue
                      ? "size-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0"
                      : "size-9 rounded-xl bg-panel text-[#14110e]/55 dark:text-[#f0ece6]/55 flex items-center justify-center shrink-0"
                  }
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-ink truncate">
                    {verb} hos {item.app.companyName}
                  </div>
                  <div className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mt-0.5 truncate">
                    {item.app.title}
                  </div>
                </div>
                <span
                  className={
                    overdue
                      ? "text-[12px] font-medium text-accent shrink-0"
                      : "text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 shrink-0"
                  }
                >
                  {text}
                </span>
              </PrefetchLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CvNudge({ percent }: { percent: number }) {
  return (
    <Link
      href="/app/cv"
      className="group mt-4 md:mt-6 flex items-center gap-4 bg-panel rounded-3xl p-5 md:p-6 hover:bg-surface transition-colors"
    >
      <div className="flex-1 min-w-0">
        <SectionLabel className="mb-2">CV-en din er {percent}% ferdig</SectionLabel>
        <div className="h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden max-w-md">
          <div
            className="h-full bg-ink rounded-full transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <span className="text-[13px] text-accent group-hover:text-ink whitespace-nowrap shrink-0">
        Fullfør CV →
      </span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface rounded-3xl p-5 md:p-6 border border-black/5 dark:border-white/5">
      <div className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
        {value}
      </div>
      <div className="text-[12px] text-[#14110e]/70 dark:text-[#f0ece6]/70 mt-3">{label}</div>
      {sub && (
        <div className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45 mt-1">{sub}</div>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "neutral" | "muted";
}) {
  const dot =
    tone === "positive"
      ? "#16a34a"
      : tone === "neutral"
        ? "#94a3b8"
        : "#d1d5db";
  return (
    <div className="bg-surface rounded-2xl p-4 md:p-5 border border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: dot }}
        />
        <span className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/60 dark:text-[#f0ece6]/60">
          {label}
        </span>
      </div>
      <div className="text-[28px] md:text-[32px] leading-none tracking-[-0.03em] font-medium">
        {value}
      </div>
    </div>
  );
}
