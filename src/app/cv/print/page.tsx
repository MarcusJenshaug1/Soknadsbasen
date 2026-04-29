"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TemplateRenderer } from "@/components/templates";
import { getGoogleFontsUrl } from "@/lib/design-tokens";
import type { ResumeData } from "@/store/useResumeStore";

/**
 * /cv/print
 *
 * Bare-bones page rendered by Puppeteer for PDF generation.
 * Reads resume data from window.__PDF_DATA__ (injected by the renderer
 * via evaluateOnNewDocument) so we don't need a cross-process token store.
 * Falls back to /api/pdf/data?token=xxx for backwards compatibility with
 * any in-flight legacy callers.
 */
export default function PrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Laster…</div>}>
      <PrintContent />
    </Suspense>
  );
}

function PrintContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [data, setData] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const injected = (window as unknown as { __PDF_DATA__?: ResumeData }).__PDF_DATA__;
    if (injected) {
      setData(injected);
      return;
    }
    if (!token) {
      setError("Mangler data");
      return;
    }
    fetch(`/api/pdf/data?token=${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Token ugyldig eller utløpt");
        return r.json();
      })
      .then((d) => setData(d as ResumeData))
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;
  if (!data) return <div style={{ padding: 40 }}>Laster…</div>;

  const fontsUrl = getGoogleFontsUrl(data.fontPair);

  return (
    <>
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}
      <div id="cv-print-target">
        <TemplateRenderer data={data} />
      </div>
    </>
  );
}
