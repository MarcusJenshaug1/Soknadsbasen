import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionLabel } from "@/components/ui/Pill";
import { PeriodSelector } from "./PeriodSelector";

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

export default async function InnsiktPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: Period }>;
}) {
  const session = await getSession();
  if (!session) redirect("/logg-inn");

  const sp = await searchParams;
  const period: Period = sp.period ?? "90d";
  const cutoff = periodCutoff(period);

  const apps = await prisma.jobApplication.findMany({
    where: {
      userId: session.userId,
      createdAt: { gte: cutoff },
      archivedAt: null,
    },
    include: {
      activities: {
        where: {
          type: { in: ["interview", "offer", "status"] },
        },
        orderBy: { occurredAt: "asc" },
        take: 1,
      },
    },
  });

  const sent = apps.filter((a) => a.status !== "draft");
  const responded = sent.filter((a) =>
    ["interview", "offer", "accepted", "declined"].includes(a.status),
  );
  const responseRate =
    sent.length > 0 ? Math.round((responded.length / sent.length) * 1000) / 10 : 0;

  // Per-source breakdown
  const sourceMap = new Map<string, { sent: number; responded: number }>();
  for (const a of sent) {
    const key = inferSource(a.source);
    const entry = sourceMap.get(key) ?? { sent: 0, responded: 0 };
    entry.sent++;
    if (["interview", "offer", "accepted", "declined"].includes(a.status)) entry.responded++;
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
    { label: "Førstegangssamtale", n: apps.filter((a) => a.activities.length > 0 || ["interview", "offer", "accepted", "declined"].includes(a.status)).length },
    { label: "Intervjurunder", n: apps.filter((a) => ["interview", "offer", "accepted", "declined"].includes(a.status)).length },
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
    if (["interview", "offer", "accepted", "declined"].includes(a.status)) entry.responded++;
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
      ["interview", "offer", "accepted", "declined"].includes(a.status),
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

  if (apps.length === 0) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10">
        <SectionLabel className="mb-3">Innsikt</SectionLabel>
        <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-4">
          Ingen data for perioden ennå.
        </h1>
        <p className="text-[14px] text-[#14110e]/60 max-w-md">
          Når du har noen søknader over litt tid, dukker mønstre og trender opp
          her.
        </p>
        <Link
          href="/app/pipeline"
          className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a]"
        >
          Åpne pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <SectionLabel className="mb-3">Innsikt</SectionLabel>
          <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
            Mønstrene dine
          </h1>
          <p className="text-[13px] text-[#14110e]/60 mt-2">
            Hva fungerer, hva fungerer ikke.
          </p>
        </div>
        <PeriodSelector current={period} />
      </div>

      {/* Hero */}
      <div className="bg-[#14110e] text-[#faf8f5] rounded-3xl p-6 md:p-10 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
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
                  changePp > 0 ? "text-[#c15a3a] text-[16px]" : "text-white/50 text-[16px]"
                }
              >
                {changePp > 0 ? "+" : ""}
                {changePp} pp
              </div>
            )}
          </div>
          <p className="text-[14px] text-white/65 leading-relaxed">
            {responded.length} av {sent.length} sendte søknader har fått svar i
            perioden.
          </p>
        </div>
        <div className="shrink-0">
          <svg width="340" height="90" className="max-w-full">
            <path
              d={buildSparkline(points)}
              stroke="#c15a3a"
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex justify-between text-[10px] text-white/50 mt-2 w-[340px] max-w-full">
            <span>12 uker siden</span>
            <span>nå</span>
          </div>
        </div>
      </div>

      {/* Source rate + Funnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5">
          <SectionLabel className="mb-5">Svarrate per kilde</SectionLabel>
          {sources.length === 0 ? (
            <p className="text-[13px] text-[#14110e]/50">
              Ingen kilde-data ennå.
            </p>
          ) : (
            <div className="space-y-4">
              {sources.map((r) => (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between text-[13px] mb-1.5">
                    <span>
                      {r.label}{" "}
                      <span className="text-[#14110e]/45 text-[11px]">
                        ({r.sent})
                      </span>
                    </span>
                    <span className="text-[18px] font-medium tracking-tight">
                      {r.pct}%
                    </span>
                  </div>
                  <div className="h-1 bg-black/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#14110e] rounded-full"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5">
          <SectionLabel className="mb-5">Trakten din</SectionLabel>
          <div className="space-y-2.5">
            {funnel.map((r, i) => {
              const width = funnelMax ? Math.round((r.n / funnelMax) * 100) : 0;
              const op = 1 - i * 0.15;
              return (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="text-[12px] w-32 text-[#14110e]/75 shrink-0">
                    {r.label}
                  </div>
                  <div className="flex-1 bg-[#eee9df] h-7 rounded-full relative overflow-hidden">
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
        <div className="bg-[#eee9df] rounded-3xl p-6 md:p-8">
          <SectionLabel className="mb-3">Tid til svar</SectionLabel>
          <div className="text-[40px] md:text-[48px] leading-none tracking-[-0.03em] font-medium">
            {medianLatency > 0 ? medianLatency : "—"}
          </div>
          <div className="text-[12px] text-[#14110e]/60 mt-1.5">
            dager i median
          </div>
          <p className="text-[12px] text-[#14110e]/70 mt-5 leading-relaxed">
            Oppfølging etter 5 dager øker svarprosent med{" "}
            <span className="text-[#c15a3a] font-medium">2,1×</span> basert på
            bransjedata.
          </p>
        </div>

        <div className="md:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-black/5">
          <SectionLabel className="mb-5">Roller som gir svar</SectionLabel>
          <div className="space-y-1">
            {roles.length === 0 && (
              <div className="text-[13px] text-[#14110e]/50">
                For få søknader til å rangere roller.
              </div>
            )}
            {roles.map((r, i) => (
              <div
                key={r.role + i}
                className="flex items-center gap-4 py-3 border-b border-black/5 last:border-0 text-[13px]"
              >
                <span className="flex-1 font-medium truncate">{r.role}</span>
                <span className="text-[#14110e]/55 w-20 text-right text-[12px]">
                  {r.sent} sendt
                </span>
                <span className="text-[#c15a3a] font-medium w-20 text-right text-[12px]">
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
