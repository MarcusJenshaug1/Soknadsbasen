import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationDetail } from "./ApplicationDetail";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);
  if (!userId) redirect("/logg-inn");

  const app = await prisma.jobApplication.findFirst({
    where: { id, userId },
    include: {
      tasks: { orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }] },
      activities: { orderBy: { occurredAt: "desc" } },
      company: { select: { id: true, name: true, website: true } },
      coverLetter: { select: { id: true, updatedAt: true, body: true } },
      interviewStages: { orderBy: { round: "asc" } },
    },
  });

  if (!app) notFound();

  return <ApplicationDetail initial={JSON.parse(JSON.stringify(app))} />;
}
