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

  let sent = 0;

  for (const app of apps) {
    const reminders: { title: string; body: string; url: string }[] = [];

    if (app.interviewAt) {
      const isToday = app.interviewAt >= todayStart && app.interviewAt < tomorrowStart;
      const is3Days = app.interviewAt >= in3Days && app.interviewAt < in3DaysEnd;
      if (isToday)
        reminders.push({ title: "Intervju i dag", body: `${app.title} hos ${app.companyName}`, url: `/app/pipeline/${app.id}` });
      else if (is3Days)
        reminders.push({ title: "Intervju om 3 dager", body: `${app.title} hos ${app.companyName}`, url: `/app/pipeline/${app.id}` });
    }

    if (app.deadlineAt) {
      const isToday = app.deadlineAt >= todayStart && app.deadlineAt < tomorrowStart;
      const is3Days = app.deadlineAt >= in3Days && app.deadlineAt < in3DaysEnd;
      if (isToday)
        reminders.push({ title: "Søknadsfrist i dag", body: `${app.title} hos ${app.companyName}`, url: `/app/pipeline/${app.id}` });
      else if (is3Days)
        reminders.push({ title: "Søknadsfrist om 3 dager", body: `${app.title} hos ${app.companyName}`, url: `/app/pipeline/${app.id}` });
    }

    if (app.followUpAt && app.followUpAt >= todayStart && app.followUpAt < tomorrowStart) {
      reminders.push({ title: "Oppfølging i dag", body: `${app.title} hos ${app.companyName}`, url: `/app/pipeline/${app.id}` });
    }

    if (reminders.length === 0) continue;

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: app.userId },
    });

    for (const reminder of reminders) {
      // Lagre i-app varsel
      await prisma.notification.create({
        data: { userId: app.userId, title: reminder.title, body: reminder.body, url: reminder.url },
      });

      // Send push til alle enheter
      for (const sub of subs) {
        const ok = await sendPush(sub, { ...reminder, tag: `app-${app.id}` });
        if (!ok) {
          // Fjern ugyldig subscription
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }

      sent++;
    }
  }

  return NextResponse.json({ sent });
}
