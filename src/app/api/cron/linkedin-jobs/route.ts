import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickLinkedInCandidates } from "@/lib/jobs/linkedin-selector";
import { buildJobPost } from "@/lib/linkedin/format-post";
import { postShare } from "@/lib/linkedin/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SPACING_MS = 60_000;

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
  const limit = Math.min(
    5,
    Math.max(1, Number(url.searchParams.get("limit") ?? 3)),
  );
  const dryRun = process.env.LINKEDIN_DRY_RUN === "1";

  let candidates;
  try {
    candidates = await pickLinkedInCandidates(limit);
  } catch (err) {
    return NextResponse.json(
      { error: "Selector failed", message: errMsg(err) },
      { status: 500 },
    );
  }

  if (candidates.length === 0) {
    return NextResponse.json({ posted: 0, failed: 0, candidates: [], note: "no candidates" });
  }

  const results: Array<{
    jobId: string;
    slug: string;
    score: number;
    status: "posted" | "failed" | "skipped-dryrun";
    postUrn?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const formatted = buildJobPost(c.job);

    try {
      const r = await postShare(formatted);
      await prisma.linkedInPost.create({
        data: {
          jobId: c.job.id,
          status: r.dryRun ? "dry-run" : "posted",
          postUrn: r.postUrn,
          score: c.score,
        },
      });
      results.push({
        jobId: c.job.id,
        slug: c.job.slug,
        score: c.score,
        status: r.dryRun ? "skipped-dryrun" : "posted",
        postUrn: r.postUrn,
      });
    } catch (err) {
      const msg = errMsg(err);
      try {
        await prisma.linkedInPost.create({
          data: {
            jobId: c.job.id,
            status: "failed",
            errorMsg: msg.slice(0, 1000),
            score: c.score,
          },
        });
      } catch {
        // ignore log-write failure
      }
      results.push({
        jobId: c.job.id,
        slug: c.job.slug,
        score: c.score,
        status: "failed",
        error: msg,
      });
    }

    if (i < candidates.length - 1 && !dryRun) {
      await new Promise((r) => setTimeout(r, SPACING_MS));
    }
  }

  const posted = results.filter((r) => r.status === "posted").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json(
    { posted, failed, dryRun, candidates: results },
    { status: failed > 0 ? 207 : 200 },
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
