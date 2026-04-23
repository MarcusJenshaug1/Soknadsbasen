import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { storePdfData } from "@/lib/pdfTokenStore";
import { getSession } from "@/lib/auth";
import { hasActiveAccess } from "@/lib/access";

/**
 * POST /api/pdf
 * Body: { data: ResumeData }
 *
 * 1. Stores CV data in a one-time token
 * 2. Launches Puppeteer to render /cv/print?token=xxx
 * 3. Returns the resulting PDF
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  if (!(await hasActiveAccess(session.userId))) {
    return NextResponse.json(
      { error: "Krever aktivt abonnement", redirect: "/app/billing" },
      { status: 402 },
    );
  }

  try {
    const body = await req.json();
    const data = body?.data;
    if (!data) {
      return NextResponse.json({ error: "Missing resume data" }, { status: 400 });
    }

    // Store data for the print page to fetch
    const token = storePdfData(data);

    // Determine base URL from the incoming request
    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const printUrl = `${baseUrl}/cv/print?token=${token}`;

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30_000 });

    // Wait a brief moment for fonts to load
    await page.evaluate(() => document.fonts.ready);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();

    // Build filename from resume contact info
    const firstName = data.contact?.firstName || "";
    const lastName = data.contact?.lastName || "";
    const role = data.role || "";
    const parts = ["CV", firstName, lastName, role].filter(Boolean);
    const filename = parts.join(" – ") + ".pdf";

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    console.error("[PDF] Generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
