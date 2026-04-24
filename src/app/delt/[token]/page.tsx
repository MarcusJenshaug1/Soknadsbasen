import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShareView } from "./ShareView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: { user: { select: { name: true } }, revokedAt: true, expiresAt: true },
  });
  if (!link || link.revokedAt || link.expiresAt < new Date()) {
    return { title: "Lenke ikke tilgjengelig" };
  }
  const firstName = link.user.name?.split(" ")[0] ?? "Anonym";
  return { title: `${firstName} sin jobbsøking — Søknadsbasen` };
}

export default async function SharedPipelinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      userId: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  if (!link || link.revokedAt || link.expiresAt < new Date()) {
    notFound();
  }

  const [applications, sessions] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId: link.userId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        companyName: true,
        companyWebsite: true,
        title: true,
        status: true,
        applicationDate: true,
        source: true,
        session: { select: { name: true, status: true } },
      },
    }),
    prisma.jobSearchSession.findMany({
      where: { userId: link.userId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        startedAt: true,
        closedAt: true,
        _count: { select: { applications: true } },
      },
    }),
  ]);

  const firstName = link.user.name?.split(" ")[0] ?? "Anonym";

  return (
    <ShareView
      firstName={firstName}
      applications={JSON.parse(JSON.stringify(applications))}
      sessions={JSON.parse(JSON.stringify(sessions))}
      expiresAt={link.expiresAt.toISOString()}
    />
  );
}
