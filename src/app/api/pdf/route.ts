import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasActiveAccess } from "@/lib/access";
import { renderResumePdf } from "@/lib/pdfRender";

/**
 * POST /api/pdf
 * Body: { data: ResumeData }
 * Renders CV to PDF for the authenticated owner.
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

    const { buffer, filename } = await renderResumePdf(data);

    return new Response(new Blob([buffer], { type: "application/pdf" }), {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PDF] Generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: message },
      { status: 500 },
    );
  }
}
