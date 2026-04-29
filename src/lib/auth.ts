import { cache } from "react";
import { UserRole } from "@prisma/client";
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
  role: UserRole;
  isInternalAdmin: boolean;
  isSalesRep: boolean;
  org: OrgContext | null;
}

export interface SalesRepSession extends SessionPayload {
  role: UserRole;
  salesRep: {
    id: string;
    status: string;
    commissionRateBp: number;
    monthlyQuotaCents: number;
  };
}

export type SelgerPanelViewerRole = "selger" | "admin";

export interface SelgerPanelAccess extends SessionPayload {
  role: UserRole;
  viewerRole: SelgerPanelViewerRole;
  salesRep: {
    id: string | null;
    status: string;
    commissionRateBp: number;
    monthlyQuotaCents: number;
  };
}

export interface UserRoles {
  isInternalAdmin: boolean;
  isSalesRep: boolean;
  orgMemberships: Array<{
    id: string;
    slug: string;
    displayName: string;
    role: "admin" | "member";
  }>;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

type SupabaseAuthUser = Awaited<
  ReturnType<Awaited<ReturnType<typeof supabaseServer>>["auth"]["getUser"]>
>["data"]["user"];

// Felles cache for supabase.auth.getUser(). Uten dette kjøres HTTP-kallet 2x
// per gated render (én gang via getSession, én gang via getSessionWithAccess).
const getSupabaseAuthUser = cache(async (): Promise<SupabaseAuthUser> => {
  const supabase = await supabaseServer();
  try {
    const res = await supabase.auth.getUser();
    return res.data.user;
  } catch (err) {
    console.warn("[getSupabaseAuthUser] Supabase getUser failed:", err);
    return null;
  }
});

// Deduped per request via React cache — flere layout/page-kall = 1 I/O.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const user = await getSupabaseAuthUser();
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
    const user = await getSupabaseAuthUser();
    if (!user) return null;

    let profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        role: true,
        subscription: { select: { status: true, currentPeriodEnd: true } },
        salesRepProfile: { select: { status: true } },
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
        select: { id: true, email: true, name: true, role: true },
      });
      const isInternalAdmin = created.email === process.env.ADMIN_EMAIL || created.role === "admin";
      return {
        userId: created.id,
        email: created.email,
        name: created.name,
        hasAccess: isInternalAdmin,
        role: created.role,
        isInternalAdmin,
        isSalesRep: false,
        org: null,
      };
    }

    const sub = profile.subscription;
    const personalAccess =
      !!sub && ACTIVE_STATUSES.has(sub.status) && sub.currentPeriodEnd > new Date();

    const activeMembership = profile.orgMemberships[0] ?? null;
    const orgAccess =
      !!activeMembership && ACTIVE_STATUSES.has(activeMembership.org.status);

    const isInternalAdmin =
      profile.role === "admin" || profile.email === process.env.ADMIN_EMAIL || profile.isAdmin;
    const isSalesRep =
      profile.role === "selger" && profile.salesRepProfile?.status === "active";
    const hasAccess = personalAccess || orgAccess || isInternalAdmin || isSalesRep;

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
      role: profile.role,
      isInternalAdmin,
      isSalesRep,
      org,
    };
  },
);

/// Cached selger-session for /selger/* layouts. Returns null hvis ikke selger eller status != 'active'.
export const getSalesRepSession = cache(
  async (): Promise<SalesRepSession | null> => {
    const session = await getSession();
    if (!session) return null;

    const profile = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        salesRepProfile: {
          select: {
            id: true,
            status: true,
            commissionRateBp: true,
            monthlyQuotaCents: true,
          },
        },
      },
    });

    if (!profile || profile.role !== "selger" || !profile.salesRepProfile) return null;
    if (profile.salesRepProfile.status !== "active") return null;

    return {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      salesRep: {
        id: profile.salesRepProfile.id,
        status: profile.salesRepProfile.status,
        commissionRateBp: profile.salesRepProfile.commissionRateBp,
        monthlyQuotaCents: profile.salesRepProfile.monthlyQuotaCents,
      },
    };
  },
);

/// Adgang til /selger-panelet \u2014 \u00e5pen for b\u00e5de aktive selgere og interne admins.
/// Admins som ikke har egen SalesRepProfile f\u00e5r tomme metrics (egen userId) men kan navigere alt.
export const getSelgerPanelAccess = cache(
  async (): Promise<SelgerPanelAccess | null> => {
    const session = await getSession();
    if (!session) return null;

    const profile = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        salesRepProfile: {
          select: {
            id: true,
            status: true,
            commissionRateBp: true,
            monthlyQuotaCents: true,
          },
        },
      },
    });
    if (!profile) return null;

    const isInternalAdmin =
      profile.role === "admin" || profile.email === process.env.ADMIN_EMAIL || profile.isAdmin;
    const isActiveSelger =
      profile.role === "selger" && profile.salesRepProfile?.status === "active";

    if (!isActiveSelger && !isInternalAdmin) return null;

    return {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      viewerRole: isActiveSelger ? "selger" : "admin",
      salesRep: profile.salesRepProfile
        ? {
            id: profile.salesRepProfile.id,
            status: profile.salesRepProfile.status,
            commissionRateBp: profile.salesRepProfile.commissionRateBp,
            monthlyQuotaCents: profile.salesRepProfile.monthlyQuotaCents,
          }
        : {
            id: null,
            status: "admin-view",
            commissionRateBp: 0,
            monthlyQuotaCents: 0,
          },
    };
  },
);

export const getUserRoles = cache(async (): Promise<UserRoles | null> => {
  const session = await getSession();
  if (!session) return null;

  const profile = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      isAdmin: true,
      salesRepProfile: { select: { status: true } },
    },
  });
  const isInternalAdmin =
    session.email === process.env.ADMIN_EMAIL ||
    profile?.role === "admin" ||
    profile?.isAdmin === true;
  const isSalesRep =
    profile?.role === "selger" && profile?.salesRepProfile?.status === "active";

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
    isSalesRep,
    orgMemberships: orgMemberships.map((m) => ({
      id: m.org.id,
      slug: m.org.slug,
      displayName: m.org.displayName,
      role: m.role as "admin" | "member",
    })),
  };
});
