import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getAiQuotaStatus } from "@/lib/ai/credits";

/**
 * GET /api/ai/quota — gjenstående AI-kreditter for innlogget bruker.
 * Driver kvote-meteret og 402-feilvisningene i klienten. Billing-siden
 * kaller getAiQuotaStatus direkte server-side (ingen self-fetch).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const status = await getAiQuotaStatus(session.userId);
  return NextResponse.json(status, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
