import { NextRequest, NextResponse } from "next/server";
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
  const pages = Math.min(20, Number(url.searchParams.get("pages") ?? 5));
  const pageSize = Math.min(100, Number(url.searchParams.get("size") ?? 100));

  try {
    const result = await syncNavJobs({ pages, pageSize });
    return NextResponse.json(result, {
      status: result.errors.length > 0 ? 207 : 200,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Sync failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
