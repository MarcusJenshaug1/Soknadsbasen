"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Lys" },
  { value: "dark", label: "Mørk" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex rounded-full border border-black/10 dark:border-white/10 bg-panel overflow-hidden text-[12px]">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          className={
            theme === o.value
              ? "px-3 py-1.5 bg-ink text-bg font-medium transition-colors"
              : "px-3 py-1.5 text-ink/60 hover:text-ink transition-colors"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
