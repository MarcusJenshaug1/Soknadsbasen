import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { getActiveSession } from "@/lib/session-context";
import { prisma } from "@/lib/prisma";
import { PipelineView } from "./PipelineView";
import { PIPELINE_STATUSES } from "@/lib/pipeline";
import { SessionBanner } from "@/components/sessions/SessionBanner";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const [userId, sp, activeJobSession] = await Promise.all([
    getSessionUserId(),
    searchParams,
    getActiveSession(),
  ]);
  if (!userId) redirect("/logg-inn");

  const requestedSessionId = sp.session ?? undefined;
  const isHistorical =
    !!requestedSessionId && requestedSessionId !== activeJobSession?.id;

  // Scope til ønsket sesjon, eller aktiv sesjon som default
  const scopedSessionId = requestedSessionId ?? activeJobSession?.id;

  const applications = await prisma.jobApplication.findMany({
    where: {
      userId,
      status: { in: PIPELINE_STATUSES as unknown as string[] },
      ...(scopedSessionId ? { sessionId: scopedSessionId } : {}),
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
      deadlineAt: true,
      interviewAt: true,
      followUpAt: true,
      archivedAt: true,
      updatedAt: true,
    },
  });

  return (
    <>
      {isHistorical && requestedSessionId && (
        <div className="px-4 md:px-10 pt-6">
          <SessionBanner sessionId={requestedSessionId} />
        </div>
      )}
      <PipelineView initialApplications={applications} readOnly={isHistorical} />
    </>
  );
}
