import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function toIcsDateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, "");
}

function buildEvent(uid: string, summary: string, description: string, dtstart: string, allDay: boolean): string {
  const now = toIcsDate(new Date().toISOString());
  if (allDay) {
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${toIcsDateOnly(dtstart)}`,
      `DTEND;VALUE=DATE:${toIcsDateOnly(dtstart)}`,
      `SUMMARY:${summary.replace(/[,;\\]/g, "\\$&")}`,
      `DESCRIPTION:${description.replace(/[,;\\]/g, "\\$&")}`,
      "END:VEVENT",
    ].join("\r\n");
  }
  const start = toIcsDate(dtstart);
  const end = toIcsDate(new Date(new Date(dtstart).getTime() + 60 * 60 * 1000).toISOString());
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary.replace(/[,;\\]/g, "\\$&")}`,
    `DESCRIPTION:${description.replace(/[,;\\]/g, "\\$&")}`,
    "END:VEVENT",
  ].join("\r\n");
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return new Response("Ikke autentisert", { status: 401 });

  const { id } = await ctx.params;
  const app = await prisma.jobApplication.findFirst({
    where: { id, userId: session.userId },
    select: {
      companyName: true,
      title: true,
      interviewAt: true,
      deadlineAt: true,
      followUpAt: true,
    },
  });

  if (!app) return new Response("Ikke funnet", { status: 404 });

  const events: string[] = [];

  if (app.interviewAt) {
    events.push(buildEvent(
      `${id}-interview`,
      `Intervju: ${app.title} hos ${app.companyName}`,
      `Jobbintervju via Søknadsbasen`,
      app.interviewAt.toISOString(),
      false,
    ));
  }

  if (app.deadlineAt) {
    events.push(buildEvent(
      `${id}-deadline`,
      `Søknadsfrist: ${app.title} hos ${app.companyName}`,
      `Søknadsfrist via Søknadsbasen`,
      app.deadlineAt.toISOString(),
      true,
    ));
  }

  if (app.followUpAt) {
    events.push(buildEvent(
      `${id}-followup`,
      `Oppfølging: ${app.title} hos ${app.companyName}`,
      `Påminnelse om oppfølging via Søknadsbasen`,
      app.followUpAt.toISOString(),
      true,
    ));
  }

  if (events.length === 0) {
    return new Response("Ingen datoer satt", { status: 400 });
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Søknadsbasen//NO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  const filename = encodeURIComponent(`${app.companyName} - ${app.title}.ics`);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
