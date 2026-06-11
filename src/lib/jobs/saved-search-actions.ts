"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server actions for lagrede søk. Alle er bruker-scopet (userId fra session i
 * where-leddet — aldri stol på id alene).
 */

export type SavedSearchActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createSavedSearch(
  name: string,
  query: string,
): Promise<SavedSearchActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Du må være innlogget for å lagre søk." };

  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Gi søket et navn." };

  const count = await prisma.savedSearch.count({ where: { userId: session.userId } });
  if (count >= 20) {
    return { ok: false, error: "Du kan ha maks 20 lagrede søk. Slett et først." };
  }

  // Querystring valideres lett: kun kjente tegn, maks-lengde. Selve parsingen
  // (ukjente slugs droppes) skjer ved bruk — et «ugyldig» søk er bare tomt.
  const safeQuery = query.replace(/^\?/, "").slice(0, 600);

  const created = await prisma.savedSearch.create({
    data: { userId: session.userId, name: trimmed, query: safeQuery },
    select: { id: true },
  });
  revalidatePath("/app/lagrede-sok");
  return { ok: true, id: created.id };
}

export async function updateSavedSearch(
  id: string,
  patch: {
    name?: string;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
    pushEnabled?: boolean;
    emailFrequency?: "daglig" | "umiddelbart";
  },
): Promise<SavedSearchActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Ikke innlogget" };

  const data: Record<string, string | boolean> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim().slice(0, 80);
    if (!trimmed) return { ok: false, error: "Navnet kan ikke være tomt." };
    data.name = trimmed;
  }
  for (const key of ["emailEnabled", "inAppEnabled", "pushEnabled"] as const) {
    if (typeof patch[key] === "boolean") data[key] = patch[key];
  }
  if (patch.emailFrequency === "daglig" || patch.emailFrequency === "umiddelbart") {
    data.emailFrequency = patch.emailFrequency;
  }

  const res = await prisma.savedSearch.updateMany({
    where: { id, userId: session.userId },
    data,
  });
  if (res.count === 0) return { ok: false, error: "Fant ikke søket." };
  revalidatePath("/app/lagrede-sok");
  return { ok: true };
}

export async function deleteSavedSearch(id: string): Promise<SavedSearchActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Ikke innlogget" };
  const res = await prisma.savedSearch.deleteMany({
    where: { id, userId: session.userId },
  });
  if (res.count === 0) return { ok: false, error: "Fant ikke søket." };
  revalidatePath("/app/lagrede-sok");
  return { ok: true };
}
