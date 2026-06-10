"use client";

import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { Modal } from "@/components/ui/Modal";
import { TemplateRenderer } from "./templates";
import { getGoogleFontsUrl } from "@/lib/design-tokens";

/** Screen-only scaled preview shown inside the editor panel */
export function LivePreview() {
  const data = useResumeStore((state) => state.data);
  const fontsUrl = getGoogleFontsUrl(data.fontPair);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}

      <div className="relative w-full flex flex-col items-center">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="sticky top-0 z-10 self-end inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-black/10 dark:border-white/10 text-[11px] text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors shadow-sm"
        >
          <Maximize2 className="size-3.5" />
          Full størrelse
        </button>

        {/* `zoom` (i motsetning til transform: scale) reflower layouten, så
            BÅDE bredde og høyde krymper. Miniatyren reserverer dermed bare
            sitt synlige fotavtrykk, uten horisontal scroll eller stort tomrom
            under CV-en. Skalaen settes per breakpoint via en CSS-variabel:
            behagelig liten på mobil, litt større på desktop. */}
        <div
          className="mt-2 [--cv-zoom:0.4] sm:[--cv-zoom:0.46] lg:[--cv-zoom:0.54] xl:[--cv-zoom:0.6]"
          style={{ zoom: "var(--cv-zoom)" }}
        >
          <TemplateRenderer data={data} />
        </div>
      </div>

      <Modal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        ariaLabel="Forhåndsvisning i full størrelse"
        panelClassName="w-full max-w-[860px] max-h-[92vh] overflow-y-auto rounded-2xl bg-bg shadow-2xl border border-black/10"
      >
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-black/8 dark:border-white/8 px-5 py-3 flex items-center justify-between gap-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/55 dark:text-[#f0ece6]/55">
            Forhåndsvisning
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Lukk"
            className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-[#14110e]/60 dark:text-[#f0ece6]/60 hover:text-ink transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Lys bakgrunn så CV-en leses som på papir, uavhengig av tema.
            `zoom` reflower layouten så CV-en fyller bredden uten horisontal
            scroll på smale skjermer, og rendres i full 100 % størrelse på
            desktop for lesbar gjengivelse. */}
        <div className="bg-panel px-2 sm:px-6 py-6 flex justify-center">
          <div
            className="[--cv-zoom:0.62] sm:[--cv-zoom:0.85] lg:[--cv-zoom:1]"
            style={{ zoom: "var(--cv-zoom)" }}
          >
            <TemplateRenderer data={data} />
          </div>
        </div>
      </Modal>
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
