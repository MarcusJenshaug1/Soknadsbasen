import { parseCVText } from "@/lib/cv-parser";

/* ═══════════════════════════════════════════════════════════ */
/* POST /api/import/cv                                        */
/* Accepts a PDF file upload (FormData), extracts text, and   */
/* returns parsed CV data ready to merge into the store.      */
/* ═══════════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name) {
      return Response.json({ error: "Ingen fil lastet opp" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Bare PDF-filer er støttet" }, { status: 400 });
    }

    // Size limit: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "Filen er for stor (maks 10 MB)" }, { status: 400 });
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Extract text using pdfjs-dist
    const text = await extractPdfText(uint8Array);

    if (!text.trim()) {
      return Response.json(
        { error: "Kunne ikke lese tekst fra PDFen. Prøv en annen fil." },
        { status: 422 }
      );
    }

    // Parse the extracted text into structured CV data
    const parsed = parseCVText(text);

    return Response.json({
      ok: true,
      data: parsed,
      rawText: text.substring(0, 3000), // Include some raw text for debugging
    });
  } catch (err) {
    console.error("[/api/import/cv] Error:", err);
    return Response.json(
      { error: "Noe gikk galt under import. Prøv igjen." },
      { status: 500 }
    );
  }
}

/* ─── PDF text extraction via pdfjs-dist ──────────────────── */

async function extractPdfText(data: Uint8Array): Promise<string> {
  // Dynamic import to avoid bundling issues
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Build text with position-aware line breaks
    let lastY: number | null = null;
    const lineTexts: string[] = [];
    let currentLine = "";

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = textItem.transform[5];

      // If Y position changed significantly, it's a new line
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) lineTexts.push(currentLine.trim());
        currentLine = textItem.str;
      } else {
        currentLine += (currentLine ? " " : "") + textItem.str;
      }
      lastY = y;
    }

    if (currentLine.trim()) lineTexts.push(currentLine.trim());
    pages.push(lineTexts.join("\n"));
  }

  return pages.join("\n");
}
