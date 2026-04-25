import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string | null;
}

export interface OrgContext {
  id: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
  brandColor: string | null;
  role: "admin" | "member";
  sharesDataWithOrg: boolean;
}

export interface SessionWithAccess extends SessionPayload {
  hasAccess: boolean;
  org: OrgContext | null;
}

export interface UserRoles {
  isInternalAdmin: boolean;
  orgMemberships: Array<{
    id: string;
    slug: string;
    displayName: string;
    role: "admin" | "member";
  }>;
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
        isAdmin: (user.user_metadata?.isAdmin as boolean | undefined) ?? false,
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
        isAdmin: true,
        subscription: { select: { status: true, currentPeriodEnd: true } },
        orgMemberships: {
          where: { status: "active" },
          select: {
            role: true,
            sharesDataWithOrg: true,
            org: {
              select: {
                id: true,
                slug: true,
                displayName: true,
                logoUrl: true,
                brandColor: true,
                status: true,
              },
            },
          },
          take: 1,
        },
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
          isAdmin: (user.user_metadata?.isAdmin as boolean | undefined) ?? false,
        },
        select: { id: true, email: true, name: true },
      });
      return {
        userId: created.id,
        email: created.email,
        name: created.name,
        hasAccess: created.email === process.env.ADMIN_EMAIL,
        org: null,
      };
    }

    const sub = profile.subscription;
    const personalAccess =
      !!sub && ACTIVE_STATUSES.has(sub.status) && sub.currentPeriodEnd > new Date();

    const activeMembership = profile.orgMemberships[0] ?? null;
    const orgAccess =
      !!activeMembership && ACTIVE_STATUSES.has(activeMembership.org.status);

    const isAdmin = profile.email === process.env.ADMIN_EMAIL || profile.isAdmin;
    const hasAccess = personalAccess || orgAccess || isAdmin;

    const org: OrgContext | null = activeMembership
      ? {
          id: activeMembership.org.id,
          slug: activeMembership.org.slug,
          displayName: activeMembership.org.displayName,
          logoUrl: activeMembership.org.logoUrl,
          brandColor: activeMembership.org.brandColor,
          role: activeMembership.role as "admin" | "member",
          sharesDataWithOrg: activeMembership.sharesDataWithOrg,
        }
      : null;

    return {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      hasAccess,
      org,
    };
  },
);

export const getUserRoles = cache(async (): Promise<UserRoles | null> => {
  const session = await getSession();
  if (!session) return null;

  const isInternalAdmin = session.email === process.env.ADMIN_EMAIL;

  const orgMemberships = await prisma.orgMembership.findMany({
    where: {
      userId: session.userId,
      role: "admin",
      status: "active",
    },
    select: {
      org: {
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      },
      role: true,
    },
  });

  return {
    isInternalAdmin,
    orgMemberships: orgMemberships.map((m) => ({
      id: m.org.id,
      slug: m.org.slug,
      displayName: m.org.displayName,
      role: m.role as "admin" | "member",
    })),
  };
});
