import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

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
// Bruker getSessionUserId (lett) for å unngå dobbel prisma.user.findUnique
// i samme request — getSessionWithAccess har allerede sikret user-raden.
export const getActiveSession = cache(
  async (): Promise<ActiveSessionPayload | null> => {
    const userId = await getSessionUserId();
    if (!userId) return null;

    return prisma.jobSearchSession.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { id: true, name: true, status: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    });
  },
);

// Alle sesjoner for brukeren, nyeste først.
export const getAllSessions = cache(async (): Promise<SessionSummary[]> => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  return prisma.jobSearchSession.findMany({
    where: { userId },
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

/** Hjelpefunksjon: auto-opprett sesjon med standard-navn for brukeren.
 *  Tilordner også eksisterende søknader uten sesjon (migrering av eldre data). */
export async function createDefaultSession(
  userId: string,
): Promise<{ id: string }> {
  const now = new Date();
  const monthNames = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Desember",
  ];
  const name = `Jobbsøk ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const newSession = await prisma.jobSearchSession.create({
    data: { userId, name },
    select: { id: true },
  });

  await prisma.jobApplication.updateMany({
    where: { userId, sessionId: null },
    data: { sessionId: newSession.id },
  });

  return newSession;
}
