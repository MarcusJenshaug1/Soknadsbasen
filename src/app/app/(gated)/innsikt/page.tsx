import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { getActiveSession, getAllSessions } from "@/lib/session-context";
import { prisma } from "@/lib/prisma";
import { SectionLabel } from "@/components/ui/Pill";
import { InnsiktFilters } from "./InnsiktFilters";

export const dynamic = "force-dynamic";

type Period = "30d" | "90d" | "year";

function periodCutoff(p: Period): Date {
  const now = new Date();
  if (p === "30d") return new Date(now.getTime() - 30 * 86_400_000);
  if (p === "90d") return new Date(now.getTime() - 90 * 86_400_000);
  return new Date(now.getFullYear(), 0, 1);
}

function classify(status: string): "sent" | "responded" | "offer" | "rejected" | "draft" {
  if (status === "draft") return "draft";
  if (status === "rejected" || status === "withdrawn") return "rejected";
  if (status === "offer" || status === "accepted") return "offer";
  if (status === "interview") return "responded";
  return "sent";
}

function inferSource(src: string | null | undefined): string {
  if (!src) return "Annet";
  const s = src.toLowerCase();
  if (s.includes("linkedin")) return "LinkedIn";
  if (s.includes("finn")) return "FINN.no";
  if (s.includes("webcruiter")) return "Webcruiter";
  if (s.includes("referral") || s.includes("referanse") || s.includes("direkte"))
    return "Direkte kontakt";
  return src;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function buildSparkline(points: number[]): string {
  if (points.length < 2) return "";
  const w = 340;
  const h = 90;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  return points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${i * step} ${h - ((p - min) / span) * (h - 6) - 3}`,
    )
    .join(" ");
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "nå nettopp";
  if (min < 60) return `${min} min siden`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} t siden`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days} d siden`;
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export default async function InnsiktPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: Period; session?: string }>;
}) {
  const [userId, sp, sessions, activeSession] = await Promise.all([
    getSessionUserId(),
    searchParams,
    getAllSessions(),
    getActiveSession(),
  ]);
  if (!userId) redirect("/logg-inn");

  const period: Period = sp.period ?? "90d";
  const rawScope = sp.session ?? "period";

  // Resolve scope → effective sessionId | "all" | "period"
  let scope: "period" | "all" | "session" = "period";
  let effectiveSessionId: string | null = null;
  if (rawScope === "all") {
    scope = "all";
  } else if (rawScope === "active") {
    if (activeSession) {
      scope = "session";
      effectiveSessionId = activeSession.id;
    } else {
      scope = "period";
    }
  } else if (rawScope !== "period") {
    // Verify provided id belongs to user
    const match = sessions.find((s) => s.id === rawScope);
    if (match) {
      scope = "session";
      effectiveSessionId = match.id;
    }
  }

  // Behold rawScope-verdien til filter-UI så valg ikke hopper tilbake
  const filterScope =
    rawScope === "all" || rawScope === "active" || rawScope === "period"
      ? rawScope
      : effectiveSessionId ?? "period";

  const now = new Date();
  const last7Start = new Date(now.getTime() - 7 * 86_400_000);
  const prev7Start = new Date(now.getTime() - 14 * 86_400_000);

  // Hent ukesdata + CV-lenker parallelt
  const [weekApps, prevWeekApps, weekTasks, cvLinks] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId: userId, archivedAt: null, createdAt: { gte: last7Start } },
      select: { status: true, statusUpdatedAt: true, interviewAt: true },
    }),
    prisma.jobApplication.findMany({
      where: { userId: userId, archivedAt: null, createdAt: { gte: prev7Start, lt: last7Start } },
      select: { status: true },
    }),
    prisma.task.findMany({
      where: {
        completedAt: { gte: last7Start },
        application: { userId: userId },
      },
      select: { id: true },
    }),
    prisma.resumeShareLink.findMany({
      where: { userId: userId },
      select: {
        id: true,
        label: true,
        token: true,
        viewCount: true,
        lastViewedAt: true,
        revokedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { viewCount: "desc" },
    }),
  ]);

  const weekSent = weekApps.filter((a) => a.status !== "draft").length;
  const prevSent = prevWeekApps.filter((a) => a.status !== "draft").length;
  const weekInterviews = weekApps.filter(
    (a) => a.interviewAt && new Date(a.interviewAt) >= last7Start,
  ).length + weekApps.filter(
    (a) => a.status === "interview" && a.statusUpdatedAt && new Date(a.statusUpdatedAt) >= last7Start,
  ).length;
  const weekResponses = weekApps.filter((a) =>
    ["interview", "offer", "accepted", "rejected", "withdrawn"].includes(a.status) &&
    a.statusUpdatedAt && new Date(a.statusUpdatedAt) >= last7Start,
  ).length;
  const prevResponses = prevWeekApps.filter((a) =>
    ["interview", "offer", "accepted", "rejected", "withdrawn"].includes(a.status),
  ).length;
  const weekTasksDone = weekTasks.length;

  // CV-link aggregater
  const activeLinks = cvLinks.filter(
    (l) => !l.revokedAt && (!l.expiresAt || l.expiresAt > now),
  );
  const totalViews = cvLinks.reduce((s, l) => s + l.viewCount, 0);
  const lastViewedAt = cvLinks.reduce<Date | null>((latest, l) => {
    if (!l.lastViewedAt) return latest;
    if (!latest || l.lastViewedAt > latest) return l.lastViewedAt;
    return latest;
  }, null);
  const viewsLast7d = cvLinks.filter(
    (l) => l.lastViewedAt && l.lastViewedAt >= last7Start,
  ).length;
  const topLinks = cvLinks
    .filter((l) => l.viewCount > 0)
    .slice(0, 5);

  // Bygg where-clause for hovedaggregater basert på scope
  const whereBase = { userId: userId, archivedAt: null };
  const where =
    scope === "session" && effectiveSessionId
      ? { ...whereBase, sessionId: effectiveSessionId }
      : scope === "all"
      ? whereBase
      : { ...whereBase, createdAt: { gte: periodCutoff(period) } };

  const apps = await prisma.jobApplication.findMany({
    where,
    select: {
      status: true,
      statusUpdatedAt: true,
      applicationDate: true,
      source: true,
      title: true,
      createdAt: true,
      activities: {
        where: {
          type: { in: ["interview", "offer", "status"] },
        },
        orderBy: { occurredAt: "asc" },
        take: 1,
        select: { occurredAt: true, type: true },
      },
    },
  });

  const filters = (
    <InnsiktFilters
      currentPeriod={period}
      currentScope={filterScope}
      sessions={sessions.map((s) => ({ id: s.id, name: s.name, status: s.status }))}
      hasActive={!!activeSession}
    />
  );

  const cvWidget =
    cvLinks.length > 0 ? (
      <CvLinksWidget
        activeLinks={activeLinks.length}
        totalLinks={cvLinks.length}
        totalViews={totalViews}
        viewsLast7d={viewsLast7d}
        lastViewedAt={lastViewedAt}
        topLinks={topLinks.map((l) => ({
          id: l.id,
          label: l.label ?? "Uten navn",
          views: l.viewCount,
          lastViewedAt: l.lastViewedAt,
        }))}
      />
    ) : null;

  const sent = apps.filter((a) => a.status !== "draft");
  const responded = sent.filter((a) =>
    ["interview", "offer", "accepted", "declined", "rejected"].includes(a.status),
  );
  const responseRate =
    sent.length > 0 ? Math.round((responded.length / sent.length) * 1000) / 10 : 0;

  if (apps.length === 0) {
    const scopeLabel =
      scope === "session"
        ? "denne sesjonen"
        : scope === "all"
        ? "noen sesjoner"
        : "perioden";
    return (
      <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <SectionLabel className="mb-3">Innsikt</SectionLabel>
            <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
              Ingen data for {scopeLabel} ennå.
            </h1>
            <p className="text-[13px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mt-2">
              Bytt scope eller velg en annen sesjon over.
            </p>
          </div>
          {filters}
        </div>

        {weekSent > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <WeekStat label="Søknader sendt" value={weekSent} prev={prevSent} />
            <WeekStat label="Intervjuer" value={weekInterviews} prev={null} />
            <WeekStat label="Svar mottatt" value={weekResponses} prev={prevResponses} />
            <WeekStat label="Oppgaver fullført" value={weekTasksDone} prev={null} />
          </div>
        )}

        {cvWidget}

        <p className="text-[14px] text-[#14110e]/60 dark:text-[#f0ece6]/60 max-w-md mt-6">
          Når du har noen søknader over litt tid, dukker mønstre og trender opp
          her.
        </p>
        <Link
          href="/app/pipeline"
          className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830]"
        >
          Åpne pipeline
        </Link>
      </div>
    );
  }

  // Svar-fordeling: hva slags svar er det egentlig?
  const breakdown = {
    interview: apps.filter((a) => a.status === "interview").length,
    offer: apps.filter((a) => a.status === "offer").length,
    accepted: apps.filter((a) => a.status === "accepted").length,
    declined: apps.filter((a) => a.status === "declined").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  // Per-source breakdown
  const sourceMap = new Map<string, { sent: number; responded: number }>();
  for (const a of sent) {
    const key = inferSource(a.source);
    const entry = sourceMap.get(key) ?? { sent: 0, responded: 0 };
    entry.sent++;
    if (["interview", "offer", "accepted", "declined", "rejected"].includes(a.status)) entry.responded++;
    sourceMap.set(key, entry);
  }
  const sources = Array.from(sourceMap.entries())
    .map(([label, v]) => ({
      label,
      sent: v.sent,
      pct: v.sent ? Math.round((v.responded / v.sent) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  // Funnel
  const funnel = [
    { label: "Søknader sendt", n: sent.length },
    { label: "Førstegangssamtale", n: apps.filter((a) => a.activities.length > 0 || ["interview", "offer", "accepted", "declined", "rejected"].includes(a.status)).length },
    { label: "Intervjurunder", n: apps.filter((a) => ["interview", "offer", "accepted", "declined", "rejected"].includes(a.status)).length },
    { label: "Tilbud mottatt", n: apps.filter((a) => ["offer", "accepted"].includes(a.status)).length },
    { label: "Akseptert", n: apps.filter((a) => a.status === "accepted").length },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.n), 1);

  // Time-to-response (days from applicationDate → first interview/offer activity)
  const latencies: number[] = [];
  for (const a of apps) {
    if (!a.applicationDate) continue;
    const first = a.activities[0];
    if (!first) continue;
    const d = Math.max(
      0,
      Math.round(
        (first.occurredAt.getTime() - a.applicationDate.getTime()) / 86_400_000,
      ),
    );
    if (d >= 0 && d < 365) latencies.push(d);
  }
  const medianLatency = median(latencies);

  // Roles table
  const roleMap = new Map<string, { sent: number; responded: number }>();
  for (const a of sent) {
    const key = a.title.trim();
    const entry = roleMap.get(key) ?? { sent: 0, responded: 0 };
    entry.sent++;
    if (["interview", "offer", "accepted", "declined", "rejected"].includes(a.status)) entry.responded++;
    roleMap.set(key, entry);
  }
  const roles = Array.from(roleMap.entries())
    .map(([role, v]) => ({ role, ...v, pct: v.sent ? Math.round((v.responded / v.sent) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.responded - a.responded)
    .slice(0, 6);

  // 12-week sparkline — rolling response rate
  const weeks = 12;
  const points: number[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(Date.now() - w * 7 * 86_400_000);
    const start = new Date(end.getTime() - 7 * 86_400_000);
    const winApps = apps.filter(
      (a) => a.createdAt >= start && a.createdAt < end && a.status !== "draft",
    );
    const winResp = winApps.filter((a) =>
      ["interview", "offer", "accepted", "declined", "rejected"].includes(a.status),
    ).length;
    points.push(winApps.length ? Math.round((winResp / winApps.length) * 100) : 0);
  }
  const midIdx = Math.floor(points.length / 2);
  const earlyAvg =
    points.slice(0, midIdx).reduce((s, p) => s + p, 0) / Math.max(1, midIdx);
  const lateAvg =
    points.slice(midIdx).reduce((s, p) => s + p, 0) /
    Math.max(1, points.length - midIdx);
  const changePp = Math.round((lateAvg - earlyAvg) * 10) / 10;

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <SectionLabel className="mb-3">Innsikt</SectionLabel>
          <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
            Mønstrene dine
          </h1>
          <p className="text-[13px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mt-2">
            Hva fungerer, hva fungerer ikke.
          </p>
        </div>
        {filters}
      </div>

      {/* Siste 7 dager */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <WeekStat label="Søknader sendt" value={weekSent} prev={prevSent} />
        <WeekStat label="Intervjuer" value={weekInterviews} prev={null} />
        <WeekStat label="Svar mottatt" value={weekResponses} prev={prevResponses} />
        <WeekStat label="Oppgaver fullført" value={weekTasksDone} prev={null} />
      </div>

      {/* Hero */}
      <div className="bg-ink text-bg rounded-3xl p-6 md:p-10 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-md">
          <SectionLabel tone="accent" className="mb-4">
            Svarprosent · 12 uker
          </SectionLabel>
          <div className="flex items-baseline gap-4 mb-4">
            <div className="text-[56px] md:text-[80px] leading-none tracking-[-0.04em] font-medium">
              {responseRate.toLocaleString("nb-NO", {
                maximumFractionDigits: 1,
              })}
              %
            </div>
            {changePp !== 0 && (
              <div
                className={
                  changePp > 0 ? "text-[#D5592E] text-[16px]" : "text-bg/50 text-[16px]"
                }
              >
                {changePp > 0 ? "+" : ""}
                {changePp} pp
              </div>
            )}
          </div>
          <p className="text-[14px] text-bg/65 leading-relaxed">
            {responded.length} av {sent.length} sendte søknader har fått svar i
            perioden.
          </p>
        </div>
        <div className="shrink-0">
          <svg width="340" height="90" className="max-w-full">
            <path
              d={buildSparkline(points)}
              stroke="#D5592E"
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex justify-between text-[10px] text-bg/50 mt-2 w-[340px] max-w-full">
            <span>12 uker siden</span>
            <span>nå</span>
          </div>
        </div>
      </div>

      {cvWidget}

      {/* Svar-fordeling */}
      {responded.length > 0 && (
        <div className="bg-surface rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/5 mb-4 mt-4">
          <SectionLabel className="mb-5">Hva slags svar</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <BreakdownCell
              label="Intervju"
              value={breakdown.interview}
              color="#14110e"
            />
            <BreakdownCell
              label="Tilbud"
              value={breakdown.offer}
              color="#16a34a"
            />
            <BreakdownCell
              label="Takket ja"
              value={breakdown.accepted}
              color="#16a34a"
            />
            <BreakdownCell
              label="Takket nei"
              value={breakdown.declined}
              color="#94a3b8"
            />
            <BreakdownCell
              label="Avslag"
              value={breakdown.rejected}
              color="#d1d5db"
            />
          </div>
        </div>
      )}

      {/* Source rate + Funnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/5">
          <SectionLabel className="mb-5">Svarrate per kilde</SectionLabel>
          {sources.length === 0 ? (
            <p className="text-[13px] text-[#14110e]/50 dark:text-[#f0ece6]/50">
              Ingen kilde-data ennå.
            </p>
          ) : (
            <div className="space-y-4">
              {sources.map((r) => (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between text-[13px] mb-1.5">
                    <span>
                      {r.label}{" "}
                      <span className="text-[#14110e]/45 dark:text-[#f0ece6]/45 text-[11px]">
                        ({r.sent})
                      </span>
                    </span>
                    <span className="text-[18px] font-medium tracking-tight">
                      {r.pct}%
                    </span>
                  </div>
                  <div className="h-1 bg-black/8 dark:bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink rounded-full"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/5">
          <SectionLabel className="mb-5">Trakten din</SectionLabel>
          <div className="space-y-2.5">
            {funnel.map((r, i) => {
              const width = funnelMax ? Math.round((r.n / funnelMax) * 100) : 0;
              const op = 1 - i * 0.15;
              return (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="text-[12px] w-32 text-[#14110e]/75 dark:text-[#f0ece6]/75 shrink-0">
                    {r.label}
                  </div>
                  <div className="flex-1 bg-panel h-7 rounded-full relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full flex items-center justify-end px-3 text-[11px] font-medium text-[#faf8f5]"
                      style={{
                        width: `${Math.max(width, 8)}%`,
                        background: `rgba(20,17,14,${Math.max(op, 0.3)})`,
                      }}
                    >
                      {r.n}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Latency + roles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-panel rounded-3xl p-6 md:p-8">
          <SectionLabel className="mb-3">Tid til svar</SectionLabel>
          <div className="text-[40px] md:text-[48px] leading-none tracking-[-0.03em] font-medium">
            {medianLatency > 0 ? medianLatency : "—"}
          </div>
          <div className="text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mt-1.5">
            dager i median
          </div>
          <p className="text-[12px] text-[#14110e]/70 dark:text-[#f0ece6]/70 mt-5 leading-relaxed">
            Oppfølging etter 5 dager øker svarprosent med{" "}
            <span className="text-accent font-medium">2,1×</span> basert på
            bransjedata.
          </p>
        </div>

        <div className="md:col-span-2 bg-surface rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/5">
          <SectionLabel className="mb-5">Roller som gir svar</SectionLabel>
          <div className="space-y-1">
            {roles.length === 0 && (
              <div className="text-[13px] text-[#14110e]/50 dark:text-[#f0ece6]/50">
                For få søknader til å rangere roller.
              </div>
            )}
            {roles.map((r, i) => (
              <div
                key={r.role + i}
                className="flex items-center gap-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0 text-[13px]"
              >
                <span className="flex-1 font-medium truncate">{r.role}</span>
                <span className="text-[#14110e]/55 dark:text-[#f0ece6]/55 w-20 text-right text-[12px]">
                  {r.sent} sendt
                </span>
                <span className="text-accent font-medium w-20 text-right text-[12px]">
                  {r.responded} svar
                </span>
                <span className="text-[18px] tracking-tight font-medium w-14 text-right">
                  {r.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekStat({
  label,
  value,
  prev,
}: {
  label: string;
  value: number;
  prev: number | null;
}) {
  const delta = prev !== null ? value - prev : null;
  return (
    <div className="bg-surface rounded-2xl p-4 border border-black/5 dark:border-white/5">
      <div className="text-[11px] uppercase tracking-[0.12em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-2">
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[28px] leading-none tracking-[-0.03em] font-medium">
          {value}
        </div>
        {delta !== null && (
          <div
            className={`text-[12px] font-medium shrink-0 ${
              delta > 0
                ? "text-[#16a34a]"
                : delta < 0
                  ? "text-[#D5592E]"
                  : "text-[#14110e]/35"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "—"}
          </div>
        )}
      </div>
      <div className="text-[10px] text-[#14110e]/40 dark:text-[#f0ece6]/40 mt-1">siste 7 dager</div>
    </div>
  );
}

function BreakdownCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-panel/50 p-4 border border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color }}
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

function CvLinksWidget({
  activeLinks,
  totalLinks,
  totalViews,
  viewsLast7d,
  lastViewedAt,
  topLinks,
}: {
  activeLinks: number;
  totalLinks: number;
  totalViews: number;
  viewsLast7d: number;
  lastViewedAt: Date | null;
  topLinks: Array<{ id: string; label: string; views: number; lastViewedAt: Date | null }>;
}) {
  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/5 mb-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <SectionLabel className="mb-2">CV-lenker</SectionLabel>
          <p className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
            Hvem ser CV-en din. Tall gjelder alle lenker uavhengig av sesjon.
          </p>
        </div>
        <Link
          href="/app#cv"
          className="text-[12px] text-accent hover:underline shrink-0"
        >
          Administrer lenker →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <CvStat label="Visninger totalt" value={totalViews} />
        <CvStat
          label="Siste 7 dager"
          value={viewsLast7d}
          subtitle="lenker åpnet"
        />
        <CvStat
          label="Aktive lenker"
          value={activeLinks}
          subtitle={`${totalLinks} totalt`}
        />
        <CvStat
          label="Sist sett"
          value={lastViewedAt ? formatRelative(lastViewedAt) : "—"}
        />
      </div>

      {topLinks.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-3">
            Mest sette lenker
          </div>
          <div className="space-y-1">
            {topLinks.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 py-2.5 border-b border-black/5 dark:border-white/5 last:border-0 text-[13px]"
              >
                <span className="flex-1 font-medium truncate">{l.label}</span>
                {l.lastViewedAt && (
                  <span className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45 shrink-0">
                    {formatRelative(l.lastViewedAt)}
                  </span>
                )}
                <span className="text-[18px] tracking-tight font-medium tabular-nums w-12 text-right">
                  {l.views}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CvStat({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl bg-panel/50 p-4 border border-black/5 dark:border-white/5">
      <div className="text-[11px] uppercase tracking-[0.12em] text-[#14110e]/50 dark:text-[#f0ece6]/50 mb-2">
        {label}
      </div>
      <div className="text-[24px] md:text-[28px] leading-none tracking-[-0.03em] font-medium">
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] text-[#14110e]/40 dark:text-[#f0ece6]/40 mt-1.5">
          {subtitle}
        </div>
      )}
    </div>
  );
}
