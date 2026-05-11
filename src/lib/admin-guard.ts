import { NextResponse } from "next/server";
import { getSupabaseAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AdminGuardOk {
  ok: true;
  userId: string;
  email: string;
}

export type AdminGuardResult =
  | AdminGuardOk
  | { ok: false; response: NextResponse };

function forbidden(reason = "Ikke tilgang"): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: reason }, { status: 403 }) };
}

function unauthenticated(): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: "Ikke innlogget" }, { status: 401 }) };
}

/**
 * Verifies that the *real* Supabase-authenticated user is an internal admin.
 * Bypasses impersonation cookies on purpose, so an impersonating admin can
 * still call admin-only endpoints (e.g. to stop impersonating).
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const authUser = await getSupabaseAuthUser();
  if (!authUser) return unauthenticated();

  const profile = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, email: true, role: true, isAdmin: true },
  });

  if (!profile) return forbidden();

  const isInternalAdmin =
    profile.role === "admin" ||
    profile.isAdmin === true ||
    profile.email === process.env.ADMIN_EMAIL;

  if (!isInternalAdmin) return forbidden();

  return { ok: true, userId: profile.id, email: profile.email };
}
