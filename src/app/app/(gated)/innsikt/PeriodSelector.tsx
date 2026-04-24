"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { id: "30d", label: "Siste 30 dager" },
  { id: "90d", label: "Siste 90 dager" },
  { id: "year", label: "Hele 2026" },
] as const;

export function PeriodSelector({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function change(next: string) {
    const sp = new URLSearchParams(params);
    sp.set("period", next);
    router.push(`?${sp.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => change(e.target.value)}
      className="bg-surface border border-black/10 dark:border-white/10 rounded-full px-4 py-2 text-[12px] outline-none focus:border-accent"
    >
      {OPTIONS.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
