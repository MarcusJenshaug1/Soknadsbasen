import { prisma } from "@/lib/prisma";

export async function notifySalesRep(
  salesRepId: string,
  payload: { title: string; body: string; url?: string },
) {
  await prisma.notification.create({
    data: {
      userId: salesRepId,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
    },
  });
}
