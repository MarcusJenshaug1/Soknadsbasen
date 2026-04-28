"use client";

import { useState } from "react";
import { Check, Download, Link2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import type { ResumeData } from "@/store/useResumeStore";
import { TemplateRenderer } from "@/components/templates";

interface Props {
  data: ResumeData;
  ownerName: string;
  pdfUrl: string;
}

export function SharedResumeView({ data, ownerName, pdfUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unsupported, ignore */
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="sticky top-0 z-20 border-b border-black/8 dark:border-white/8 bg-bg/85 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Logo href="/" size="sm" />

          <div className="hidden md:flex flex-col items-center min-w-0 flex-1 -mt-0.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45">
              CV
            </span>
            <span className="text-[13px] font-medium truncate max-w-full">
              {ownerName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Kopier lenke"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-[13px] font-medium transition-colors"
            >
              {copied ? (
                <Check className="size-3.5 text-success" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              {copied ? "Kopiert" : "Kopier lenke"}
            </button>
            <a
              href={pdfUrl}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 h-9 rounded-lg bg-accent text-white text-[13px] font-medium hover:bg-accent-hover transition-colors"
            >
              <Download className="size-3.5" />
              <span>
                Last ned<span className="hidden sm:inline"> PDF</span>
              </span>
            </a>
          </div>
        </div>

        <div className="md:hidden border-t border-black/5 dark:border-white/5 px-4 py-2.5 text-center">
          <div className="text-[9px] uppercase tracking-[0.2em] text-ink/45 leading-none mb-1">
            CV
          </div>
          <div className="text-[13px] font-medium truncate">{ownerName}</div>
        </div>
      </header>

      <main className="flex-1">
        <div className="overflow-x-auto px-4 md:px-6 py-6 md:py-12">
          <div className="mx-auto w-fit">
            <TemplateRenderer data={data} />
          </div>
        </div>
      </main>

      <footer className="border-t border-black/8 dark:border-white/8 bg-panel/40">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[12px] text-ink/55">
            Laget med{" "}
            <Link
              href="/"
              prefetch={true}
              className="font-medium text-ink hover:text-accent transition-colors"
            >
              Søknadsbasen
            </Link>
          </p>
          <Link
            href="/"
            prefetch={true}
            className="text-[12px] text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Lag din egen CV gratis →
          </Link>
        </div>
      </footer>
    </div>
  );
}
