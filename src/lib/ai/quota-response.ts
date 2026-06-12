import { NextResponse } from "next/server";

import type { ConsumeResult } from "./credits";

/**
 * Standard feilsvar når consumeAiCredit avviser. Beholder dagens
 * { error: string }-form (alle klienter leser data.error) og legger på
 * code + remaining for branching. 402 = tom kvote (429 er opptatt av
 * rate-limit), 403 = mangler aktivt abonnement.
 */
export function quotaErrorResponse(
  result: Extract<ConsumeResult, { ok: false }>,
): NextResponse {
  if (result.reason === "no_access") {
    return NextResponse.json(
      {
        error: "AI-funksjonene krever aktivt abonnement.",
        code: "no_access",
        remaining: 0,
      },
      { status: 403 },
    );
  }
  return NextResponse.json(
    {
      error:
        "Du er tom for AI-kreditter denne perioden. Kjøp påfyll eller vent til neste periode.",
      code: "quota_exhausted",
      remaining: 0,
    },
    { status: 402 },
  );
}
