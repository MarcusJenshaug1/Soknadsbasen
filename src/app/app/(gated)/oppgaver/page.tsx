import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OppgaverView } from "./OppgaverView";

export const dynamic = "force-dynamic";

export default async function OppgaverPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/logg-inn");

  const tasks = await prisma.task.findMany({
    where: { application: { userId } },
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      application: {
        select: { id: true, companyName: true, title: true, status: true },
      },
    },
  });

  return <OppgaverView initial={JSON.parse(JSON.stringify(tasks))} />;
}
