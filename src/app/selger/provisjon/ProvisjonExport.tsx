"use client";

import { useState } from "react";

export function ProvisjonExport() {
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  function download(format: "csv" | "pdf") {
    window.open(`/api/sales/provisjon/eksport?format=${format}&period=${period}`, "_blank");
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="px-2.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] text-[11px] outline-none border-0 font-mono"
      />
      <button
        type="button"
        onClick={() => download("csv")}
        className="px-3 py-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.06] text-[11px] hover:bg-black/[0.1] transition-colors"
      >
        CSV
      </button>
      <button
        type="button"
        onClick={() => download("pdf")}
        className="px-3 py-1.5 rounded-full bg-ink text-bg text-[11px] hover:opacity-90 transition-opacity"
      >
        PDF
      </button>
    </div>
  );
}
