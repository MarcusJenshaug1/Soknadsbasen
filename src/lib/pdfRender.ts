import type { ResumeData } from "@/store/useResumeStore";
import type { Browser } from "puppeteer-core";

interface RenderedPdf {
  buffer: Uint8Array<ArrayBuffer>;
  filename: string;
}

const isVercel = !!process.env.VERCEL;

async function launchBrowser(): Promise<Browser> {
  if (isVercel) {
    const [{ default: chromium }, { default: puppeteerCore }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    }) as unknown as Browser;
  }
  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  }) as unknown as Browser;
}

/**
 * Render a CV to PDF via Puppeteer. Used by /api/pdf (authenticated owner)
 * and /api/cv/share/[token]/pdf (public via share link).
 *
 * Injects resume data directly into the Puppeteer page context (window.__PDF_DATA__)
 * before navigation, then loads /cv/print which reads it. Avoids any cross-process
 * token store, which is critical on Vercel where serverless invocations don't share memory.
 *
 * On Vercel, uses puppeteer-core + @sparticuz/chromium (lambda-compatible binary).
 * Locally, uses the full puppeteer package which auto-downloads Chromium.
 */
export async function renderResumePdf(
  data: ResumeData,
  baseUrl: string,
): Promise<RenderedPdf> {
  const printUrl = `${baseUrl}/cv/print`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument((injected) => {
      (window as unknown as { __PDF_DATA__?: unknown }).__PDF_DATA__ = injected;
    }, data);
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
