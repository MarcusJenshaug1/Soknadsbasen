import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string | null;
}

export interface SessionWithAccess extends SessionPayload {
  hasAccess: boolean;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

// Deduped per request via React cache — flere layout/page-kall = 1 I/O.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const supabase = await supabaseServer();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch (err) {
    // Network blip / Supabase unreachable → treat as anonymous instead of
    // crashing server-rendered pages (landing etc).
    console.warn("[getSession] Supabase getUser failed:", err);
    return null;
  }
  if (!user) return null;

  // Ensure a matching app-level profile exists. First-time sign-ins (created
  // via registration) seed this via the register flow; fall back to on-the-fly
  // creation here in case the row is missing.
  let profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true },
  });

  if (!profile) {
    if (user.email) {
      // Orphan from a prior Supabase auth user (same email, different id).
      // The auth user is gone, so the orphan profile is unreachable — clean it up.
      await prisma.user.deleteMany({ where: { email: user.email } });
    }
    profile = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.name as string | undefined) ?? null,
      },
      select: { id: true, email: true, name: true },
    });
  }

  return {
    userId: profile.id,
    email: profile.email,
    name: profile.name,
  };
});

// Slår sammen auth + profil + abonnements-sjekk til én Prisma-rundtur.
// Bruk denne i /app/layout og /app/(gated)/layout — sparer 1 DB-kall per nav.
export const getSessionWithAccess = cache(
  async (): Promise<SessionWithAccess | null> => {
    const supabase = await supabaseServer();
    let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
    try {
      const res = await supabase.auth.getUser();
      user = res.data.user;
    } catch (err) {
      console.warn("[getSessionWithAccess] Supabase getUser failed:", err);
      return null;
    }
    if (!user) return null;

    let profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: { select: { status: true, currentPeriodEnd: true } },
      },
    });

    if (!profile) {
      if (user.email) {
        await prisma.user.deleteMany({ where: { email: user.email } });
      }
      const created = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email ?? "",
          name: (user.user_metadata?.name as string | undefined) ?? null,
        },
        select: { id: true, email: true, name: true },
      });
      profile = { ...created, subscription: null };
    }

    const sub = profile.subscription;
    const hasAccess =
      !!sub && ACTIVE_STATUSES.has(sub.status) && sub.currentPeriodEnd > new Date();

    return {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      hasAccess,
    };
  },
);
