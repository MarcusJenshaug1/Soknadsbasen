"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  icon?: React.ReactNode;
  chips: string[];
  /** Antall som vises før "+N til"-knapp. Når null = ingen ekspander, vis chips opp til extraCount-cap. */
  collapsedLimit?: number | null;
  /** Brukes når collapsedLimit er null: viser "+N" tekst etter chips (statisk). */
  extraCount?: number;
  variant: "match" | "missing";
  /** "inline" = label på samme rad som chips (kompakt). "stacked" = label over chips (større). */
  layout?: "inline" | "stacked";
};

export function AtsChipRow({
  label,
  icon,
  chips,
  collapsedLimit,
  extraCount,
  variant,
  layout = "stacked",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const total = chips.length;
  const visible =
    collapsedLimit == null
      ? chips
      : expanded
        ? chips
        : chips.slice(0, collapsedLimit);
  const hidden = collapsedLimit == null ? 0 : total - visible.length;

  if (layout === "inline") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#14110e]/55 dark:text-[#f0ece6]/55 shrink-0">
          {label}
        </span>
        {visible.map((kw) => (
          <Chip key={kw} variant={variant}>
            {kw}
          </Chip>
        ))}
        {extraCount != null && extraCount > 0 && (
          <span className="text-[11px] text-[#14110e]/50 dark:text-[#f0ece6]/50">
            +{extraCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-2 flex items-center gap-1.5">
        {icon}
        <span>
          {label}{" "}
          <span className="text-[#14110e]/35 dark:text-[#f0ece6]/35">({total})</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((kw) => (
          <Chip key={kw} variant={variant}>
            {kw}
          </Chip>
        ))}
        {hidden > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] text-[#14110e]/65 dark:text-[#f0ece6]/65 bg-panel hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
          >
            +{hidden} til
          </button>
        )}
        {expanded && collapsedLimit != null && total > collapsedLimit && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 hover:text-ink transition-colors"
          >
            Vis færre
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({
  variant,
  children,
}: {
  variant: "match" | "missing";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]",
        variant === "match"
          ? "bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
          : "bg-accent/10 text-accent",
      )}
    >
      {variant === "missing" && <span className="opacity-60">+</span>}
      {children}
    </span>
  );
}
