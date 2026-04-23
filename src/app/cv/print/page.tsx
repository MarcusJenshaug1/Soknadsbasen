"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TemplateRenderer } from "@/components/templates";
import { getGoogleFontsUrl } from "@/lib/design-tokens";
import type { ResumeData } from "@/store/useResumeStore";

/**
 * /cv/print?token=xxx
 *
 * A bare-bones page that fetches resume data from the server token store
 * and renders just the CV template — used by Puppeteer to generate PDFs.
 * No sidebar, no editor, no auth required.
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
    if (!token) {
      setError("Mangler token");
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
