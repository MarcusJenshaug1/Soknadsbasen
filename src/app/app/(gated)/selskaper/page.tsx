import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActiveSession } from "@/lib/session-context";
import { prisma } from "@/lib/prisma";
import { SectionLabel } from "@/components/ui/Pill";
import { StatusDot, STATUS_LABEL, type StatusKey } from "@/components/ui/StatusDot";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { SessionBanner } from "@/components/sessions/SessionBanner";

export const dynamic = "force-dynamic";

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "i dag";
  if (days === 1) return "i går";
  if (days < 30) return `${days}d siden`;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export default async function SelskaperPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const [session, sp, activeJobSession] = await Promise.all([
    getSession(),
    searchParams,
    getActiveSession(),
  ]);
  if (!session) redirect("/logg-inn");

  const requestedSessionId = sp.session ?? undefined;
  const isHistorical =
    !!requestedSessionId && requestedSessionId !== activeJobSession?.id;
  const scopedSessionId = requestedSessionId ?? activeJobSession?.id;

  const apps = await prisma.jobApplication.findMany({
    where: {
      userId: session.userId,
      ...(scopedSessionId ? { sessionId: scopedSessionId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      companyName: true,
      companyWebsite: true,
      title: true,
      status: true,
      updatedAt: true,
      jobUrl: true,
    },
  });

  type Entry = {
    name: string;
    website: string | null;
    count: number;
    latestStatus: string;
    latestUpdate: Date;
    latestTitle: string;
    apps: typeof apps;
  };

  const byCompany = new Map<string, Entry>();
  for (const a of apps) {
    const key = a.companyName.trim();
    const existing = byCompany.get(key);
    if (!existing) {
      byCompany.set(key, {
        name: key,
        website: a.companyWebsite,
        count: 1,
        latestStatus: a.status,
        latestUpdate: a.updatedAt,
        latestTitle: a.title,
        apps: [a],
      });
    } else {
      existing.count++;
      existing.apps.push(a);
      if (a.companyWebsite && !existing.website) existing.website = a.companyWebsite;
      if (a.updatedAt > existing.latestUpdate) {
        existing.latestUpdate = a.updatedAt;
        existing.latestStatus = a.status;
        existing.latestTitle = a.title;
      }
    }
  }

  const companies = Array.from(byCompany.values()).sort(
    (a, b) => b.latestUpdate.getTime() - a.latestUpdate.getTime(),
  );

  const pipelineHref = `/app/pipeline${requestedSessionId ? `?session=${requestedSessionId}` : ""}`;

  if (companies.length === 0) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10">
        {isHistorical && requestedSessionId && (
          <div className="mb-6">
            <SessionBanner sessionId={requestedSessionId} />
          </div>
        )}
        <SectionLabel className="mb-3">Selskaper</SectionLabel>
        <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-4">
          Ingen selskaper ennå.
        </h1>
        <p className="text-[14px] text-[#14110e]/60 dark:text-[#f0ece6]/60 max-w-md mb-6">
          Hver søknad du legger til vises samlet her — med total aktivitet og
          siste status per selskap.
        </p>
        <Link
          href={pipelineHref}
          className="inline-flex px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830]"
        >
          Åpne pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10">
      {isHistorical && requestedSessionId && (
        <div className="mb-6">
          <SessionBanner sessionId={requestedSessionId} />
        </div>
      )}
      <SectionLabel className="mb-3">Selskaper</SectionLabel>
      <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
        {companies.length} selskap{companies.length === 1 ? "" : "er"}
      </h1>
      <p className="text-[14px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mt-2 mb-10">
        Sortert etter siste aktivitet.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {companies.map((c) => (
          <div
            key={c.name}
            className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <CompanyLogo
                website={c.website}
                name={c.name}
                size="md"
                className="rounded-xl"
              />
              <StatusDot status={c.latestStatus as StatusKey} />
            </div>
            <div className="text-[15px] font-medium leading-tight mb-1">
              {c.name}
            </div>
            <div className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-3">
              {c.count} søknad{c.count === 1 ? "" : "er"} ·{" "}
              {formatRelative(c.latestUpdate)}
            </div>
            <ul className="space-y-1.5 text-[12px] text-[#14110e]/70 dark:text-[#f0ece6]/70 border-t border-black/5 dark:border-white/5 pt-3 mt-auto">
              {c.apps.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/app/pipeline/${a.id}`}
                    className="flex items-center justify-between gap-2 hover:text-accent"
                  >
                    <span className="truncate">{a.title}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[#14110e]/45 dark:text-[#f0ece6]/45">
                      {STATUS_LABEL[a.status as StatusKey] ?? a.status}
                    </span>
                  </Link>
                </li>
              ))}
              {c.apps.length > 3 && (
                <li className="text-[11px] text-[#14110e]/40 dark:text-[#f0ece6]/40">
                  + {c.apps.length - 3} til
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
