import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/// Daglig cron: flagger pending-entries som eligible når
/// 1) holdUntil har passert OG
/// 2) orgen har ≥ 3 paid Stripe-fakturaer (proxy: ≥ 3 entries i pending|eligible|paid).
/// Krever Authorization: Bearer $CRON_SECRET (Vercel cron setter denne automatisk).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const candidates = await prisma.commissionEntry.findMany({
    where: { status: "pending", holdUntil: { lte: new Date() } },
    select: { id: true, orgId: true, salesRepId: true, amountCents: true },
  });

  let released = 0;
  for (const c of candidates) {
    const paidCount = await prisma.commissionEntry.count({
      where: {
        orgId: c.orgId,
        status: { in: ["pending", "eligible", "paid"] },
      },
    });
    if (paidCount < 3) continue;
    await prisma.commissionEntry.update({
      where: { id: c.id },
      data: { status: "eligible" },
    });
    released += 1;
  }

  return NextResponse.json({ released, scanned: candidates.length });
}
