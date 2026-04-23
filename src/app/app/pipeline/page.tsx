import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PipelineView } from "./PipelineView";
import { PIPELINE_STATUSES } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await getSession();
  if (!session) redirect("/logg-inn");

  const applications = await prisma.jobApplication.findMany({
    where: {
      userId: session.userId,
      status: { in: PIPELINE_STATUSES as unknown as string[] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      companyName: true,
      title: true,
      status: true,
      statusUpdatedAt: true,
      applicationDate: true,
      deadlineAt: true,
      interviewAt: true,
      followUpAt: true,
      updatedAt: true,
    },
  });

  return <PipelineView initialApplications={applications} />;
}
