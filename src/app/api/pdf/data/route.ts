import { NextResponse } from "next/server";
import { consumePdfData } from "@/lib/pdfTokenStore";

/**
 * GET /api/pdf/data?token=xxx
 * Returns the stored resume data for a PDF render token (one-time use).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const data = consumePdfData(token);
  if (!data) return NextResponse.json({ error: "Token expired or not found" }, { status: 404 });

  return NextResponse.json(data);
}
