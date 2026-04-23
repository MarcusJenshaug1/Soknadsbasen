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

  const [app, user] = await Promise.all([
    prisma.jobApplication.findFirst({
      where: { id, userId: session.userId },
      include: { coverLetter: true },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, name: true },
    }),
  ]);
  if (!app) notFound();

  const today = new Date().toISOString().slice(0, 10);

  function normaliseDate(value: string | null | undefined): string {
    if (!value) return today;
    // Already ISO (yyyy-MM-dd)?
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // Try to parse anything else (e.g. "25. mars 2026") and fall back to today.
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? today : d.toISOString().slice(0, 10);
  }

  const letter = app.coverLetter
    ? {
        ...app.coverLetter,
        date: normaliseDate(app.coverLetter.date),
      }
    : {
        id: "",
        applicationId: app.id,
        senderName: user?.name ?? null,
        senderEmail: user?.email ?? null,
        senderPhone: null,
        senderLocation: null,
        recipientName: null,
        recipientTitle: null,
        companyAddress: app.companyName,
        date: today,
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
