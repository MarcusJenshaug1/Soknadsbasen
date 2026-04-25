"use client";

import { useState } from "react";

export function EmbedSnippet({ baseUrl }: { baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<div id="soknadsbasen-form"></div>
<script src="${baseUrl}/api/sales/widget.js" data-theme="light"></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-medium">Embed-kode</h2>
        <button
          type="button"
          onClick={copy}
          className="px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] hover:opacity-90 transition-opacity"
        >
          {copied ? "Kopiert ✓" : "Kopier"}
        </button>
      </div>
      <pre className="text-[11px] font-mono bg-black/[0.04] dark:bg-white/[0.04] rounded-lg p-3 overflow-x-auto leading-relaxed">
        {snippet}
      </pre>
    </section>
  );
}
