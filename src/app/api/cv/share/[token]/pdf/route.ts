import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResumeById } from "@/lib/resume-server";
import { renderResumePdf } from "@/lib/pdfRender";
import { checkPdfRateLimit, recordPdf } from "@/lib/cvShareToken";

/**
 * GET /api/cv/share/[token]/pdf
 * Public route. Renders the linked CV as PDF for download by the recipient.
 * Live: pulls latest UserData each request.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Mangler token" }, { status: 400 });
  }

  const link = await prisma.resumeShareLink.findUnique({
    where: { token },
    select: { userId: true, resumeId: true, expiresAt: true, revokedAt: true },
  });
  if (!link || link.revokedAt) {
    return NextResponse.json({ error: "Lenken er tilbakekalt eller utløpt" }, { status: 404 });
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "Lenken er utløpt" }, { status: 404 });
  }

  if (!checkPdfRateLimit(token)) {
    return NextResponse.json(
      { error: "For mange PDF-nedlastinger på denne lenken i dag" },
      { status: 429 },
    );
  }

  const userData = await prisma.userData.findUnique({
    where: { userId: link.userId },
    select: { resumeData: true },
  });
  const data = parseResumeById(userData?.resumeData, link.resumeId);
  if (!data) {
    return NextResponse.json(
      { error: "CV-en er slettet eller utilgjengelig" },
      { status: 410 },
    );
  }

  try {
    const { buffer, filename } = await renderResumePdf(data);
    recordPdf(token);
    return new Response(new Blob([buffer], { type: "application/pdf" }), {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CV share PDF] Generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: message },
      { status: 500 },
    );
  }
}
