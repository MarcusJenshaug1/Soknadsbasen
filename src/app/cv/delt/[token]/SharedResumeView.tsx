"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import type { ResumeData } from "@/store/useResumeStore";
import { TemplateRenderer } from "@/components/templates";

interface Props {
  data: ResumeData;
  ownerName: string;
  pdfUrl: string;
}

export function SharedResumeView({ data, ownerName, pdfUrl }: Props) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="sticky top-0 z-20 border-b border-black/8 dark:border-white/8 bg-panel/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <h1 className="text-base font-semibold text-ink truncate">
            {ownerName} sin CV
          </h1>
          <a
            href={pdfUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Download className="size-4" />
            Last ned PDF
          </a>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <TemplateRenderer data={data} />
        </div>
      </main>

      <footer className="border-t border-black/8 dark:border-white/8 bg-panel/60 py-4 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-ink/60">
          <span>Laget med Søknadsbasen</span>
          <Link href="/" prefetch={true} className="text-accent hover:underline">
            Lag din egen CV gratis →
          </Link>
        </div>
      </footer>
    </div>
  );
}
