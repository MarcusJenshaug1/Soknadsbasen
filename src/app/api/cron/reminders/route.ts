import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

// Vercel Cron: kjør daglig kl. 08:00 (se vercel.json)
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const in3Days = new Date(todayStart.getTime() + 3 * 86_400_000);
  const in3DaysEnd = new Date(in3Days.getTime() + 86_400_000);

  // Finn søknader med intervju eller frist i dag eller om 3 dager
  const apps = await prisma.jobApplication.findMany({
    where: {
      archivedAt: null,
      OR: [
        { interviewAt: { gte: todayStart, lt: tomorrowStart } },
        { interviewAt: { gte: in3Days, lt: in3DaysEnd } },
        { deadlineAt: { gte: todayStart, lt: tomorrowStart } },
        { deadlineAt: { gte: in3Days, lt: in3DaysEnd } },
        { followUpAt: { gte: todayStart, lt: tomorrowStart } },
      ],
    },
    select: {
      id: true,
      userId: true,
      companyName: true,
      title: true,
      interviewAt: true,
      deadlineAt: true,
      followUpAt: true,
    },
  });

  // Bygg alle påminnelser i minne (ingen DB-kall i loop).
  type Reminder = { appId: string; userId: string; title: string; body: string; url: string };
  const reminders: Reminder[] = [];
  for (const app of apps) {
    const baseBody = `${app.title} hos ${app.companyName}`;
    const url = `/app/pipeline/${app.id}`;
    const push = (title: string) =>
      reminders.push({ appId: app.id, userId: app.userId, title, body: baseBody, url });

    if (app.interviewAt) {
      if (app.interviewAt >= todayStart && app.interviewAt < tomorrowStart) push("Intervju i dag");
      else if (app.interviewAt >= in3Days && app.interviewAt < in3DaysEnd) push("Intervju om 3 dager");
    }
    if (app.deadlineAt) {
      if (app.deadlineAt >= todayStart && app.deadlineAt < tomorrowStart) push("Søknadsfrist i dag");
      else if (app.deadlineAt >= in3Days && app.deadlineAt < in3DaysEnd) push("Søknadsfrist om 3 dager");
    }
    if (app.followUpAt && app.followUpAt >= todayStart && app.followUpAt < tomorrowStart) {
      push("Oppfølging i dag");
    }
  }

  if (reminders.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Hent ALLE relevante subscriptions i én query, group by userId.
  const userIds = Array.from(new Set(reminders.map((r) => r.userId)));
  const allSubs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  const subsByUser = new Map<string, typeof allSubs>();
  for (const sub of allSubs) {
    const arr = subsByUser.get(sub.userId);
    if (arr) arr.push(sub);
    else subsByUser.set(sub.userId, [sub]);
  }

  // Lagre alle i-app varsler i én createMany.
  await prisma.notification.createMany({
    data: reminders.map((r) => ({
      userId: r.userId,
      title: r.title,
      body: r.body,
      url: r.url,
    })),
  });

  // Send push i parallell, samle ugyldige sub-IDs.
  const invalidSubIds = new Set<string>();
  await Promise.all(
    reminders.flatMap((r) => {
      const subs = subsByUser.get(r.userId) ?? [];
      return subs.map(async (sub) => {
        const ok = await sendPush(sub, { title: r.title, body: r.body, url: r.url, tag: `app-${r.appId}` });
        if (!ok) invalidSubIds.add(sub.id);
      });
    }),
  );

  if (invalidSubIds.size > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: Array.from(invalidSubIds) } } })
      .catch(() => {});
  }

  return NextResponse.json({ sent: reminders.length });
}
