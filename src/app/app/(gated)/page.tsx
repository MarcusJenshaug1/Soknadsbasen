import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionLabel } from "@/components/ui/Pill";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { PIPELINE_COLUMNS, PIPELINE_STATUSES } from "@/lib/pipeline";

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

function computeCvPercent(userDataResume: string | null | undefined): number {
  if (!userDataResume) return 0;
  try {
    const data = JSON.parse(userDataResume) as Record<string, unknown>;
    const buckets = [
      "contact",
      "role",
      "summary",
      "experience",
      "education",
      "skills",
      "languages",
    ] as const;
    let filled = 0;
    for (const k of buckets) {
      const v = data[k];
      if (Array.isArray(v) ? v.length > 0 : v && typeof v === "object")
        filled++;
      else if (typeof v === "string" && v.trim().length > 0) filled++;
    }
    return Math.round((filled / buckets.length) * 100);
  } catch {
    return 0;
  }
}

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) redirect("/logg-inn");

  const [apps, userData] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId: session.userId },
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
  ]);

  const active = apps.filter(
    (a) => !["accepted", "withdrawn", "rejected"].includes(a.status),
  );
  const interviewCount = apps.filter((a) => a.status === "interview").length;

  const milestone = pickNextMilestone(active);
  const cvPercent = computeCvPercent(userData?.resumeData ?? null);

  const oldestActive = active.reduce<Date | null>(
    (min, a) => (min && min < a.createdAt ? min : a.createdAt),
    null,
  );
  const daysRunning = oldestActive
    ? Math.max(1, Math.round((Date.now() - oldestActive.getTime()) / 86_400_000))
    : 0;

  const respondedCount = apps.filter(
    (a) =>
      a.status === "interview" ||
      a.status === "offer" ||
      a.status === "accepted",
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
          <p className="text-[14px] md:text-[15px] text-[#14110e]/65 mt-3">
            {active.length} aktive søknader · {interviewCount} intervjuer
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/pipeline"
            className="px-5 py-2.5 rounded-full border border-black/15 text-[13px] hover:border-black/30 transition-colors"
          >
            Ny søknad
          </Link>
          <Link
            href="/app/cv"
            className="px-5 py-2.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a] transition-colors"
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

      {/* CV + stats row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mt-4 md:mt-6">
        <div className="md:col-span-5 bg-[#eee9df] rounded-3xl p-6 md:p-8">
          <SectionLabel className="mb-3">CV-fullføring</SectionLabel>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-[48px] md:text-[56px] leading-none tracking-[-0.03em] font-medium">
              {cvPercent}
            </span>
            <span className="text-[22px] text-[#14110e]/50">%</span>
          </div>
          <div className="h-1 bg-black/10 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-[#14110e] rounded-full transition-[width]"
              style={{ width: `${cvPercent}%` }}
            />
          </div>
          <Link
            href="/app/cv"
            className="text-[13px] text-[#c15a3a] hover:text-[#14110e]"
          >
            Fullfør →
          </Link>
        </div>

        <div className="md:col-span-7 grid grid-cols-2 gap-3">
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
      </div>

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
            className="text-[13px] text-[#c15a3a] hover:text-[#14110e]"
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
                className="bg-white rounded-2xl border border-black/5 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: col.dotColor }}
                    />
                    <span className="text-[12px] font-medium">{col.label}</span>
                  </div>
                  <span className="text-[11px] text-[#14110e]/45">
                    {items.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {items.slice(0, 3).map((a) => (
                    <Link
                      key={a.id}
                      href={`/app/pipeline/${a.id}`}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-[#faf8f5] hover:bg-[#eee9df] transition-colors"
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
                        <div className="text-[11px] text-[#14110e]/55 mt-0.5 truncate">
                          {a.companyName}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="text-[11px] text-[#14110e]/40 text-center py-6">
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
      <div className="bg-[#14110e] text-[#faf8f5] rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <SectionLabel tone="accent" className="mb-4">
          Neste milepæl
        </SectionLabel>
        <h2 className="text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] font-medium mb-4">
          Ingen kommende hendelser.
        </h2>
        <p className="text-[14px] md:text-[15px] text-white/65 leading-relaxed mb-6 max-w-xl">
          {firstName ? `${firstName}, l` : "L"}egg til en intervju-dato eller
          søknadsfrist på en av søknadene for å få en oversikt her.
        </p>
        <Link
          href="/app/pipeline"
          className="inline-flex px-5 py-2.5 rounded-full bg-[#faf8f5] text-[#14110e] text-[13px] font-medium hover:bg-white"
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
    <div className="bg-[#14110e] text-[#faf8f5] rounded-3xl p-8 md:p-10 relative overflow-hidden">
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-xl">
          <SectionLabel tone="accent" className="mb-4">
            Neste milepæl
          </SectionLabel>
          <h2 className="text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] font-medium mb-4">
            {kindText} hos {milestone.app.companyName}
          </h2>
          <p className="text-[14px] md:text-[15px] text-white/65 leading-relaxed mb-6">
            {timeText}. {milestone.app.title}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/pipeline"
              className="px-5 py-2.5 rounded-full bg-[#faf8f5] text-[#14110e] text-[13px] font-medium hover:bg-white"
            >
              Åpne
            </Link>
            <Link
              href="/app/pipeline"
              className="px-5 py-2.5 rounded-full border border-white/20 text-[13px] hover:border-white/40"
            >
              Flytt i kalender
            </Link>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[56px] md:text-[80px] leading-none tracking-[-0.04em] font-medium">
            {days}
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 mt-1">
            {days === 1 ? "dag igjen" : "dager igjen"}
          </div>
        </div>
      </div>
    </div>
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
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-black/5">
      <div className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
        {value}
      </div>
      <div className="text-[12px] text-[#14110e]/70 mt-3">{label}</div>
      {sub && (
        <div className="text-[11px] text-[#14110e]/45 mt-1">{sub}</div>
      )}
    </div>
  );
}
