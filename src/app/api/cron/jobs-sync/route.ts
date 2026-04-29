import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncNavJobs } from "@/lib/jobs/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const budgetMs = Math.min(
    60_000,
    Math.max(10_000, Number(url.searchParams.get("budgetMs") ?? 50_000)),
  );

  // ?reset=1 nullstiller cursor slik at neste sync(-er) walker hele feeden
  // på nytt og oppdaterer eksisterende rader med ny data. Brukes etter
  // schema-endringer der nye felter må backfilles på gamle stillinger.
  const reset = url.searchParams.get("reset") === "1";
  let didReset = false;
  if (reset) {
    await prisma.navFeedCursor.deleteMany({ where: { id: "singleton" } });
    didReset = true;
  }

  try {
    const result = await syncNavJobs({ budgetMs });
    return NextResponse.json(
      { ...result, didReset },
      { status: result.errors.length > 0 ? 207 : 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Sync failed",
        message: err instanceof Error ? err.message : String(err),
        didReset,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
