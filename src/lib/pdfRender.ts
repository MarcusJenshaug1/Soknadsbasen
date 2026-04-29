import { createElement } from "react";
import type { Browser } from "puppeteer-core";
import { TemplateRenderer } from "@/components/templates";
import { getGoogleFontsUrl } from "@/lib/design-tokens";
import type { ResumeData } from "@/store/useResumeStore";

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

async function buildPrintHtml(data: ResumeData): Promise<string> {
  const fontsUrl = getGoogleFontsUrl(data.fontPair);
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(createElement(TemplateRenderer, { data }));
  return `<!doctype html>
<html lang="nb">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=210mm" />
    ${fontsUrl ? `<link rel="stylesheet" href="${fontsUrl}" />` : ""}
    <style>
      html, body { margin: 0; padding: 0; background: #ffffff; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

/**
 * Render a CV to PDF via Puppeteer. Used by /api/pdf (authenticated owner)
 * and /api/cv/share/[token]/pdf (public via share link).
 *
 * Server-renders the template to HTML, then feeds it to Puppeteer via setContent.
 * Avoids any HTTP roundtrip back to the same deployment, which is critical on
 * Vercel where a serverless function calling its own public URL is fragile
 * (cold-start nesting, timeouts, missing cookies).
 *
 * On Vercel, uses puppeteer-core + @sparticuz/chromium (lambda-compatible binary).
 * Locally, uses the full puppeteer package which auto-downloads Chromium.
 */
export async function renderResumePdf(data: ResumeData): Promise<RenderedPdf> {
  const html = await buildPrintHtml(data);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
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

