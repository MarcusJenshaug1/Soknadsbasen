import { NextRequest, NextResponse } from "next/server";
import { getAllPublicUrls, submitToIndexNow } from "@/lib/seo/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const urls = await getAllPublicUrls();
    const results = await submitToIndexNow(urls);
    const allOk = results.every((r) => r.ok);
    return NextResponse.json(
      {
        urlCount: urls.length,
        results,
        success: allOk,
      },
      { status: allOk ? 200 : 207 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "indexnow submit failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
