import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CollabCvJoin } from "./CollabCvJoin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Anonym entry-side for collab på CV. Validerer token serverside, renderer
 * navn-modal hvis brukeren ikke har gitt navn ennå, og deretter editor-
 * varianten (read-only + suggest).
 */
export default async function CollabCvPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.collabInvite.findUnique({
    where: { token },
    select: {
      id: true,
      resourceKind: true,
      label: true,
      expiresAt: true,
      revokedAt: true,
      owner: { select: { name: true, email: true } },
    },
  });

  if (!invite || invite.resourceKind !== "cv" || invite.revokedAt) {
    notFound();
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    notFound();
  }

  const ownerDisplay =
    invite.owner.name?.trim().split(/\s+/)[0] ??
    invite.owner.email.split("@")[0];

  return (
    <CollabCvJoin
      token={token}
      label={invite.label}
      ownerDisplayName={ownerDisplay}
    />
  );
}
