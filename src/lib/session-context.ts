import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface ActiveSessionPayload {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
  startedAt: Date;
}

export interface SessionSummary {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
  outcome: "GOT_JOB" | "PAUSE" | "OTHER" | null;
  startedAt: Date;
  closedAt: Date | null;
  notes: string | null;
  _count: { applications: number };
}

// Deduped per request — kalles fra layout + page uten ekstra DB-rundtur.
export const getActiveSession = cache(
  async (): Promise<ActiveSessionPayload | null> => {
    const auth = await getSession();
    if (!auth) return null;

    return prisma.jobSearchSession.findFirst({
      where: { userId: auth.userId, status: "ACTIVE" },
      select: { id: true, name: true, status: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    });
  },
);

// Alle sesjoner for brukeren, nyeste først.
export const getAllSessions = cache(async (): Promise<SessionSummary[]> => {
  const auth = await getSession();
  if (!auth) return [];

  return prisma.jobSearchSession.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      name: true,
      status: true,
      outcome: true,
      startedAt: true,
      closedAt: true,
      notes: true,
      _count: { select: { applications: true } },
    },
    orderBy: { startedAt: "desc" },
  });
});

/** Hjelpefunksjon: auto-opprett sesjon med standard-navn for brukeren. */
export async function createDefaultSession(
  userId: string,
): Promise<{ id: string }> {
  const now = new Date();
  const monthNames = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Desember",
  ];
  const name = `Jobbsøk ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return prisma.jobSearchSession.create({
    data: { userId, name },
    select: { id: true },
  });
}
