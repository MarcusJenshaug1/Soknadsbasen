import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { InnboksClient } from "./InnboksClient";

export const dynamic = "force-dynamic";

export default async function InnboksPage() {
  const [session, inbox, sent, folders] = await Promise.all([
    getSession(),
    prisma.inboundEmail.findMany({
      where: { deletedAt: null },
      orderBy: { receivedAt: "desc" },
      take: 500,
      select: {
        id: true, fromAddress: true, fromName: true, toAddress: true,
        subject: true, textBody: true, htmlBody: true, messageId: true,
        folderId: true, archived: true, receivedAt: true,
      },
    }),
    prisma.sentEmail.findMany({
      where: { deletedAt: null },
      orderBy: { sentAt: "desc" },
      take: 500,
      select: {
        id: true, toAddress: true, subject: true, textBody: true,
        htmlBody: true, inReplyTo: true, folderId: true, archived: true, sentAt: true,
      },
    }),
    prisma.emailFolder.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  return (
    <InnboksClient
      userName={session?.name ?? null}
      inbox={inbox.map((e) => ({ ...e, receivedAt: e.receivedAt.toISOString() }))}
      sent={sent.map((e) => ({ ...e, sentAt: e.sentAt.toISOString() }))}
      folders={folders}
    />
  );
}
