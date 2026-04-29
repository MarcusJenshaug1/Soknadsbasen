import { prisma } from "@/lib/prisma";
import { listResumesFromPayload } from "@/lib/resume-server";
import { CvModuleClient } from "./CvModuleClient";

interface Props {
  userId: string;
}

export async function CvModule({ userId }: Props) {
  const now = new Date();

  const [userData, links] = await Promise.all([
    prisma.userData.findUnique({
      where: { userId },
      select: { resumeData: true, updatedAt: true },
    }),
    prisma.resumeShareLink.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        resumeId: true,
        label: true,
        expiresAt: true,
        revokedAt: true,
        viewCount: true,
        lastViewedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const resumes = listResumesFromPayload(userData?.resumeData);
  const nameById = new Map(resumes.map((r) => [r.id, r.name]));

  const initialLinks = links.map((l) => ({
    ...l,
    expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
    revokedAt: l.revokedAt ? l.revokedAt.toISOString() : null,
    lastViewedAt: l.lastViewedAt ? l.lastViewedAt.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
    resumeName: nameById.get(l.resumeId) ?? null,
  }));

  const activeLinkCount = links.filter(
    (l) => !l.revokedAt && (!l.expiresAt || l.expiresAt > now),
  ).length;

  const lastEdited = userData?.updatedAt ? userData.updatedAt.toISOString() : null;

  return (
    <CvModuleClient
      resumes={resumes}
      initialLinks={initialLinks}
      activeLinkCount={activeLinkCount}
      lastEdited={lastEdited}
    />
  );
}
