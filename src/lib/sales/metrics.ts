import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { startOfMonth, startOfDay, endOfDay } from "./format";
import { ACTIVE_STAGES } from "./stages";

export const getSalesRepMrrThisMonth = cache(async (salesRepId: string) => {
  const monthStart = startOfMonth();
  const result = await prisma.commissionEntry.aggregate({
    where: {
      salesRepId,
      paidAt: { gte: monthStart },
      status: { in: ["pending", "eligible", "paid"] },
    },
    _sum: { invoiceAmountCents: true },
  });
  return result._sum.invoiceAmountCents ?? 0;
});

export const getSalesRepCommissionThisMonth = cache(async (salesRepId: string) => {
  const monthStart = startOfMonth();
  const result = await prisma.commissionEntry.aggregate({
    where: {
      salesRepId,
      paidAt: { gte: monthStart },
      status: { in: ["pending", "eligible", "paid"] },
    },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
});

export const getActiveCustomerCount = cache(async (salesRepId: string) => {
  return prisma.organization.count({
    where: {
      salesRepId,
      status: { in: ["active", "trialing"] },
    },
  });
});

export const getActiveCustomers = cache(async (salesRepId: string) => {
  const orgs = await prisma.organization.findMany({
    where: { salesRepId },
    select: {
      id: true,
      slug: true,
      displayName: true,
      status: true,
      seatLimit: true,
      stripeSubscriptionId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return orgs;
});

export const getPipelineByStage = cache(async (salesRepId: string) => {
  const leads = await prisma.lead.groupBy({
    by: ["stage"],
    where: {
      salesRepId,
      stage: { in: ACTIVE_STAGES as unknown as string[] },
    },
    _sum: { estimatedValueCents: true },
    _count: { _all: true },
  });
  return leads.map((l) => ({
    stage: l.stage,
    valueCents: l._sum.estimatedValueCents ?? 0,
    count: l._count._all,
  }));
});

export const getUpcomingTasks = cache(async (salesRepId: string) => {
  const horizon = new Date(endOfDay().getTime() + 86_400_000);
  return prisma.crmActivity.findMany({
    where: {
      type: "task",
      completedAt: null,
      dueAt: { lte: horizon },
      lead: { salesRepId },
    },
    select: {
      id: true,
      title: true,
      dueAt: true,
      lead: { select: { id: true, companyName: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 5,
  });
});

export const getLeaderboardThisMonth = cache(async () => {
  const monthStart = startOfMonth();
  const reps = await prisma.salesRepProfile.findMany({
    where: { status: "active" },
    select: {
      userId: true,
      monthlyQuotaCents: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  const rows = await Promise.all(
    reps.map(async (rep) => {
      const sums = await prisma.commissionEntry.aggregate({
        where: {
          salesRepId: rep.userId,
          paidAt: { gte: monthStart },
          status: { in: ["pending", "eligible", "paid"] },
        },
        _sum: { invoiceAmountCents: true, amountCents: true },
      });
      const wonThisMonth = await prisma.lead.count({
        where: {
          salesRepId: rep.userId,
          stage: "Vunnet",
          closedAt: { gte: monthStart },
        },
      });
      return {
        userId: rep.userId,
        name: rep.user.name,
        email: rep.user.email,
        mrrCents: sums._sum.invoiceAmountCents ?? 0,
        commissionCents: sums._sum.amountCents ?? 0,
        wonCount: wonThisMonth,
        quotaCents: rep.monthlyQuotaCents,
      };
    }),
  );
  return rows.sort((a, b) => b.mrrCents - a.mrrCents);
});

export const getCommissionSummary = cache(async (salesRepId: string) => {
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const [pending, eligible, paidYtd, clawback] = await Promise.all([
    prisma.commissionEntry.aggregate({
      where: { salesRepId, status: "pending" },
      _sum: { amountCents: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { salesRepId, status: "eligible" },
      _sum: { amountCents: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { salesRepId, status: "paid", paidAt: { gte: yearStart } },
      _sum: { amountCents: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { salesRepId, status: "clawback" },
      _sum: { amountCents: true },
    }),
  ]);
  return {
    pendingCents: pending._sum.amountCents ?? 0,
    eligibleCents: eligible._sum.amountCents ?? 0,
    paidYtdCents: paidYtd._sum.amountCents ?? 0,
    clawbackCents: clawback._sum.amountCents ?? 0,
  };
});

export const getChurningSoonCustomers = cache(async (salesRepId: string) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
  return prisma.organization.findMany({
    where: {
      salesRepId,
      status: { in: ["past_due", "canceled"] },
      createdAt: { gte: ninetyDaysAgo },
    },
    select: { id: true, slug: true, displayName: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
});
