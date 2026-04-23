"use client";

import { useResumeStore } from "@/store/useResumeStore";
import { TemplateRenderer } from "./templates";
import { getGoogleFontsUrl } from "@/lib/design-tokens";

/** Screen-only scaled preview shown inside the editor panel */
export function LivePreview() {
  const data = useResumeStore((state) => state.data);
  const fontsUrl = getGoogleFontsUrl(data.fontPair);

  return (
    <>
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}
      <div className="scale-[0.5] sm:scale-[0.6] lg:scale-[0.75] xl:scale-[0.85] origin-top mx-auto mb-10">
        <TemplateRenderer data={data} />
      </div>
    </>
  );
}

/**
 * Full-size print-only CV output.
 *
 * Uses the invisible-table trick to get automatic per-page margins
 * WITHOUT @page margin (which would show browser chrome like URL/date).
 *
 * When the `continuous` class is active, the table trick is bypassed
 * and the CV renders as one long continuous page.
 */
export function PrintOutput() {
  const data = useResumeStore((state) => state.data);
  const fontsUrl = getGoogleFontsUrl(data.fontPair);

  return (
    <div id="cv-print-output" className="hidden print:block">
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}

      {/* Invisible table structure for per-page spacing */}
      <table className="print-table">
        <thead>
          <tr>
            <td>
              <div className="print-header-spacer" />
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td>
              <div className="print-footer-spacer" />
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
              <TemplateRenderer data={data} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
