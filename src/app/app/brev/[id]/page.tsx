import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrevEditor } from "./BrevEditor";

export const dynamic = "force-dynamic";

export default async function BrevDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/logg-inn");

  const app = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
    include: { coverLetter: true },
  });
  if (!app) notFound();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true },
  });

  const letter = app.coverLetter ?? {
    id: "",
    applicationId: app.id,
    senderName: user?.name ?? null,
    senderEmail: user?.email ?? null,
    senderPhone: null,
    senderLocation: null,
    recipientName: null,
    recipientTitle: null,
    companyAddress: app.companyName,
    date: new Date().toISOString().slice(0, 10),
    subject: `Søknad — ${app.title}`,
    greeting: "Hei,",
    body: "",
    closing: "Med vennlig hilsen",
    fontFamily: "geist",
    accentColor: "#c15a3a",
    fontSize: "medium",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <BrevEditor
      application={{ id: app.id, companyName: app.companyName, title: app.title }}
      initial={JSON.parse(JSON.stringify(letter))}
    />
  );
}
