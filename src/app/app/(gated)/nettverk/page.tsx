import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NetworkView } from "./NetworkView";

export const dynamic = "force-dynamic";

export default async function NettverkPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/logg-inn");

  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      title: true,
      company: true,
      linkedinUrl: true,
      email: true,
      phone: true,
      photoUrl: true,
      notes: true,
      lastContactedAt: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  return <NetworkView initial={JSON.parse(JSON.stringify(contacts))} />;
}
