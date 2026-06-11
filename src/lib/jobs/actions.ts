"use server";

import { cookies } from "next/headers";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { DENSITY_COOKIE, isDensity } from "./density";

/**
 * Server actions for stillingsmodulen. Alle er fire-and-forget fra klienten —
 * feil logges og svelges (sett-status/tetthet skal aldri blokkere navigasjon).
 */

/** Markerer en stilling som sett (innloggede; anonyme bruker localStorage). */
export async function markJobSeen(jobId: string): Promise<void> {
  try {
    const session = await getSession();
    if (!session) return;
    await prisma.jobSeen.upsert({
      where: { userId_jobId: { userId: session.userId, jobId } },
      create: { userId: session.userId, jobId },
      update: {},
    });
  } catch (err) {
    console.error("markJobSeen feilet:", err instanceof Error ? err.message : err);
  }
}

/** Lagrer tetthetsvalg: cookie for alle, profil i tillegg for innloggede. */
export async function setDensity(value: string): Promise<void> {
  if (!isDensity(value)) return;
  const jar = await cookies();
  jar.set(DENSITY_COOKIE, value, {
    path: "/jobb",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  try {
    const session = await getSession();
    if (session) {
      await prisma.userData.updateMany({
        where: { userId: session.userId },
        data: { jobListDensity: value },
      });
    }
  } catch (err) {
    console.error("setDensity feilet:", err instanceof Error ? err.message : err);
  }
}

/** Oppdaterer «forrige besøk»-tidspunktet som driver Ny-markeringen. */
export async function touchLastVisit(): Promise<void> {
  const jar = await cookies();
  jar.set("sb_jobb_last_visit", String(Date.now()), {
    path: "/jobb",
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
  });
  try {
    const session = await getSession();
    if (session) {
      await prisma.userData.updateMany({
        where: { userId: session.userId },
        data: { lastJobVisitAt: new Date() },
      });
    }
  } catch (err) {
    console.error("touchLastVisit feilet:", err instanceof Error ? err.message : err);
  }
}
