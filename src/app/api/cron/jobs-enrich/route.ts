import { NextRequest, NextResponse } from "next/server";
import { enrichPendingJobs } from "@/lib/jobs/enrich";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Beriker stillinger med AI-nøkkelord + facetter og oppdaterer match-scores.
 * Kjøres etter jobs-sync hver time (samme CRON_SECRET-mønster). Daglig churn
 * på ~hundretalls annonser × ~2 s/call ved konkurranse 5 = et par minutter.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const budgetMs = Math.min(
    280_000,
    Math.max(10_000, Number(url.searchParams.get("budgetMs") ?? 50_000)),
  );
  const batchSize = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("batchSize") ?? 50)),
  );

  try {
    const result = await enrichPendingJobs({ budgetMs, batchSize });
    return NextResponse.json(result, {
      status: result.errors.length > 0 ? 207 : 200,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Enrich failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
