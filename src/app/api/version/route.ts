import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Coolify (og andre) kan injisere VERCEL_GIT_COMMIT_SHA="" — tom streng må regnes
  // som fraværende, ellers stopper ??-fallbacken og /api/version svarer blankt.
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";
  return NextResponse.json(
    { version },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
