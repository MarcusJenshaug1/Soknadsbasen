import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import type { Density } from "@/components/jobb/JobCard";

export const DENSITY_COOKIE = "sb_jobb_visning";

export function isDensity(value: string): value is Density {
  return value === "komfortabel" || value === "kompakt";
}

/**
 * Tetthetsvalg: cookie er fast path (skrives av klienten i DensityToggle);
 * profil er cross-device-fallback for innloggede uten cookie på denne enheten.
 */
export async function readDensity(userId: string | null): Promise<Density> {
  const jar = await cookies();
  const fromCookie = jar.get(DENSITY_COOKIE)?.value;
  if (fromCookie && isDensity(fromCookie)) return fromCookie;

  if (userId) {
    const data = await prisma.userData.findUnique({
      where: { userId },
      select: { jobListDensity: true },
    });
    const fromProfile = data?.jobListDensity;
    if (fromProfile && isDensity(fromProfile)) return fromProfile;
  }
  return "komfortabel";
}

/** Forrige /jobb-besøk for «Ny»-markering. null = første besøk. */
export async function readLastVisit(): Promise<Date | null> {
  const jar = await cookies();
  const raw = jar.get("sb_jobb_last_visit")?.value;
  const ts = raw ? Number(raw) : NaN;
  return Number.isFinite(ts) && ts > 0 ? new Date(ts) : null;
}
