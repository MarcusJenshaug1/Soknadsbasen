import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * AI-kreditter-kvote. Kun generative kall teller (1 credit per kall);
 * mekanisk Haiku-ekstraksjon er gratis. Aktivt abonnement (monthly/one_time)
 * og org-tilgang gir MONTHLY_AI_CREDITS per kalendermåned (UTC); trial gir
 * TRIAL_AI_CREDITS totalt (bøtte nøklet på trial-start, så månedsskifte ikke
 * gir påfyll). Kjøpt påfyll (AiCreditBalance.extra) konsumeres etter
 * månedskvoten og nullstilles aldri. Admin/selger og User.aiUnlimited har
 * evig kvote.
 *
 * All konsumering er race-safe via betinget updateMany (radlås +
 * re-evaluering under READ COMMITTED) — ingen interaktive transaksjoner,
 * pgBouncer-vennlig.
 */

export const MONTHLY_AI_CREDITS = 150;
export const TRIAL_AI_CREDITS = 25;

export type AiAction =
  | "cover_letter"
  | "cv_review"
  | "tailor_cv"
  | "interview_prep"
  | "analyze_job"
  | "cv_tips"
  | "follow_up"
  | "improve_profile"
  | "match_refresh";

export type ConsumeResult =
  | { ok: true; source: "monthly" | "extra" | "unlimited"; remaining: number | null; periodStart: Date | null }
  | { ok: false; reason: "no_access" | "empty"; remaining: 0 };

export type AiQuotaStatus = {
  unlimited: boolean;
  allowance: number;
  used: number;
  monthlyRemaining: number;
  extra: number;
  remaining: number;
  resetsAt: string | null;
  isTrial: boolean;
};

type QuotaContext =
  | { kind: "unlimited" }
  | { kind: "no_access" }
  | {
      kind: "metered";
      allowance: number;
      periodStart: Date;
      used: number;
      hasPeriodRow: boolean;
      extra: number;
      isTrial: boolean;
      resetsAt: Date;
    };

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function startOfMonthUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfNextMonthUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Én Prisma-rundtur: tilgang + kvoteperiode + forbruk + påfyll-saldo. */
async function resolveQuotaContext(userId: string): Promise<QuotaContext> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isAdmin: true,
      email: true,
      aiUnlimited: true,
      subscription: {
        select: { status: true, currentPeriodEnd: true, createdAt: true },
      },
      salesRepProfile: { select: { status: true } },
      orgMemberships: {
        where: { status: "active" },
        select: { org: { select: { status: true } } },
        take: 1,
      },
      aiCreditBalance: { select: { extra: true } },
      // Siste to periodene — riktig rad plukkes i kode (periodStart avhenger
      // av trial-status som vi først vet etter spørringen).
      aiUsage: {
        orderBy: { periodStart: "desc" },
        take: 2,
        select: { periodStart: true, used: true },
      },
    },
  });
  if (!user) return { kind: "no_access" };

  // Speiler getSessionWithAccess-reglene for interne roller.
  const isInternalAdmin =
    user.role === "admin" || user.isAdmin || user.email === process.env.ADMIN_EMAIL;
  const isSalesRep = user.role === "selger" && user.salesRepProfile?.status === "active";
  if (isInternalAdmin || isSalesRep || user.aiUnlimited) return { kind: "unlimited" };

  const sub = user.subscription;
  const subActive =
    !!sub && ACTIVE_STATUSES.has(sub.status) && sub.currentPeriodEnd > now;
  const orgAccess =
    !!user.orgMemberships[0] && ACTIVE_STATUSES.has(user.orgMemberships[0].org.status);

  if (!subActive && !orgAccess) return { kind: "no_access" };

  const isTrial = subActive && sub!.status === "trialing";
  const allowance = isTrial ? TRIAL_AI_CREDITS : MONTHLY_AI_CREDITS;
  const periodStart = isTrial
    ? // Stabil nøkkel for hele prøveperioden: Subscription-radens createdAt
      // (settes ved checkout og endres aldri) — currentPeriodEnd kan flyttes
      // i Stripe-dashboardet og ville gitt ny bøtte med friske credits.
      startOfDayUTC(sub!.createdAt)
    : startOfMonthUTC(now);
  const resetsAt = isTrial ? sub!.currentPeriodEnd : startOfNextMonthUTC(now);

  const periodRow = user.aiUsage.find(
    (r) => r.periodStart.getTime() === periodStart.getTime(),
  );

  return {
    kind: "metered",
    allowance,
    periodStart,
    used: periodRow?.used ?? 0,
    hasPeriodRow: !!periodRow,
    extra: user.aiCreditBalance?.extra ?? 0,
    isTrial,
    resetsAt,
  };
}

/**
 * Har brukeren tilgang til AI-funksjonene i det hele tatt? Samme regelsett
 * som kvote-resolveren (abonnement, org, admin/selger, aiUnlimited) — brukes
 * der hasActiveAccess er for smal (den ser kun på Subscription-raden).
 */
export async function hasAiQuotaAccess(userId: string): Promise<boolean> {
  const ctx = await resolveQuotaContext(userId);
  return ctx.kind !== "no_access";
}

/**
 * Trekker `cost` AI-kreditter (default 1). Fungerer samtidig som
 * tilgangssjekk — kall etter rate-limit, før datahenting. Ved AI-feil
 * etterpå: refundAiCredit med samme cost.
 *
 * MERK: ingen splitting på tvers av pottene — 3 igjen månedlig + 2 extra
 * dekker IKKE cost 5. Atomisk splitting ville krevd interaktiv transaksjon
 * (forbudt gjennom pgBouncer); hele kostnaden trekkes fra én pott.
 */
export async function consumeAiCredit(
  userId: string,
  _action: AiAction,
  cost = 1,
): Promise<ConsumeResult> {
  const ctx = await resolveQuotaContext(userId);

  if (ctx.kind === "unlimited") {
    return { ok: true, source: "unlimited", remaining: null, periodStart: null };
  }
  if (ctx.kind === "no_access") {
    return { ok: false, reason: "no_access", remaining: 0 };
  }

  if (!ctx.hasPeriodRow) {
    // Race-safe seeding uten upsert-P2002-håndtering.
    await prisma.aiUsage.createMany({
      data: [{ userId, periodStart: ctx.periodStart, used: 0 }],
      skipDuplicates: true,
    });
  }

  // Atomisk kjerne: increment-if-below-cap. To samtidige kall på kanten av
  // kvoten kan aldri begge passere — radlåsen serialiserer og WHERE
  // re-evalueres. lte: allowance - cost == lt: allowance når cost er 1.
  const monthly = await prisma.aiUsage.updateMany({
    where: {
      userId,
      periodStart: ctx.periodStart,
      used: { lte: ctx.allowance - cost },
    },
    data: { used: { increment: cost } },
  });
  if (monthly.count === 1) {
    const monthlyRemaining = Math.max(0, ctx.allowance - ctx.used - cost);
    return {
      ok: true,
      source: "monthly",
      remaining: monthlyRemaining + ctx.extra,
      periodStart: ctx.periodStart,
    };
  }

  // Månedskvoten tom (eller har ikke plass til hele kostnaden) — trekk fra
  // kjøpt påfyll.
  const extra = await prisma.aiCreditBalance.updateMany({
    where: { userId, extra: { gte: cost } },
    data: { extra: { decrement: cost } },
  });
  if (extra.count === 1) {
    return {
      ok: true,
      source: "extra",
      remaining: Math.max(0, ctx.extra - cost),
      periodStart: null,
    };
  }

  return { ok: false, reason: "empty", remaining: 0 };
}

/**
 * Refunder en konsumert handling når AI-kallet feilet før noe ble levert.
 * Best-effort: feil logges, kastes ikke (brukeren har allerede fått feilsvar).
 */
export async function refundAiCredit(
  userId: string,
  source: "monthly" | "extra" | "unlimited",
  periodStart: Date | null,
  cost = 1,
): Promise<void> {
  try {
    if (source === "monthly" && periodStart) {
      await prisma.aiUsage.updateMany({
        where: { userId, periodStart, used: { gte: cost } },
        data: { used: { decrement: cost } },
      });
    } else if (source === "extra") {
      await prisma.aiCreditBalance.updateMany({
        where: { userId },
        data: { extra: { increment: cost } },
      });
    }
  } catch (err) {
    console.error("refundAiCredit feilet:", err);
  }
}

/** Kostnadslogg per kall — best-effort, blokkerer aldri svaret. */
export async function recordAiUsageEvent(
  userId: string,
  action: AiAction,
  model: string,
  usage?: { inputTokens: number; outputTokens: number },
): Promise<void> {
  try {
    await prisma.aiUsageEvent.create({
      data: {
        userId,
        action,
        model,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
      },
    });
  } catch (err) {
    console.error("recordAiUsageEvent feilet:", err);
  }
}

/** Kvotestatus for UI (billing-meter, /api/ai/quota). Én rundtur. */
export async function getAiQuotaStatus(userId: string): Promise<AiQuotaStatus> {
  const ctx = await resolveQuotaContext(userId);

  if (ctx.kind === "unlimited") {
    return {
      unlimited: true,
      allowance: 0,
      used: 0,
      monthlyRemaining: 0,
      extra: 0,
      remaining: 0,
      resetsAt: null,
      isTrial: false,
    };
  }
  if (ctx.kind === "no_access") {
    return {
      unlimited: false,
      allowance: 0,
      used: 0,
      monthlyRemaining: 0,
      extra: 0,
      remaining: 0,
      resetsAt: null,
      isTrial: false,
    };
  }

  const monthlyRemaining = Math.max(0, ctx.allowance - ctx.used);
  return {
    unlimited: false,
    allowance: ctx.allowance,
    used: ctx.used,
    monthlyRemaining,
    extra: ctx.extra,
    remaining: monthlyRemaining + ctx.extra,
    resetsAt: ctx.resetsAt.toISOString(),
    isTrial: ctx.isTrial,
  };
}
