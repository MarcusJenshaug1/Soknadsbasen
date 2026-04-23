import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationDetail } from "./ApplicationDetail";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/logg-inn");

  const app = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
    include: {
      tasks: { orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }] },
      activities: { orderBy: { occurredAt: "desc" } },
      company: { select: { id: true, name: true, website: true } },
      coverLetter: { select: { id: true, updatedAt: true, body: true } },
    },
  });

  if (!app) notFound();

  return <ApplicationDetail initial={JSON.parse(JSON.stringify(app))} />;
}
