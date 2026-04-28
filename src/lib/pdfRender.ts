import puppeteer from "puppeteer";
import { storePdfData } from "@/lib/pdfTokenStore";
import type { ResumeData } from "@/store/useResumeStore";

interface RenderedPdf {
  buffer: Uint8Array<ArrayBuffer>;
  filename: string;
}

/**
 * Render a CV to PDF via Puppeteer. Used by /api/pdf (authenticated owner)
 * and /api/cv/share/[token]/pdf (public via share link).
 *
 * Stores the data under a one-time token, navigates a headless browser to
 * /cv/print?token=xxx, and returns the resulting PDF buffer plus a filename
 * derived from contact info.
 */
export async function renderResumePdf(
  data: ResumeData,
  baseUrl: string,
): Promise<RenderedPdf> {
  const token = storePdfData(data);
  const printUrl = `${baseUrl}/cv/print?token=${token}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const firstName = data.contact?.firstName || "";
    const lastName = data.contact?.lastName || "";
    const role = data.role || "";
    const parts = ["CV", firstName, lastName, role].filter(Boolean);
    const filename = parts.join(" – ") + ".pdf";

    const out = new Uint8Array(pdfBuffer.byteLength);
    out.set(pdfBuffer);
    return { buffer: out, filename };
  } finally {
    await browser.close();
  }
}

export function baseUrlFromRequest(req: Request): string {
  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}
