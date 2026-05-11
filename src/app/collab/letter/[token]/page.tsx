import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CollabPlaceholderJoin } from "../../CollabPlaceholderJoin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function CollabLetterPage({
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

  if (!invite || invite.resourceKind !== "letter" || invite.revokedAt) {
    notFound();
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    notFound();
  }

  const ownerDisplay =
    invite.owner.name?.trim().split(/\s+/)[0] ??
    invite.owner.email.split("@")[0];

  return (
    <CollabPlaceholderJoin
      token={token}
      resourceKind="letter"
      label={invite.label}
      ownerDisplayName={ownerDisplay}
    />
  );
}
