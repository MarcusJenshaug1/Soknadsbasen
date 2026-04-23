import * as React from "react";
import { cn } from "@/lib/cn";

type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "accent" | "ink" | "muted";
};

export function Pill({
  variant = "accent",
  className,
  children,
  ...rest
}: PillProps) {
  const variants = {
    accent: "bg-[#c15a3a] text-[#faf8f5]",
    ink: "bg-[#14110e] text-[#faf8f5]",
    muted: "bg-[#eee9df] text-[#14110e]/70",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.12em] font-medium",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export function SectionLabel({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div
      className={cn(
        "text-[11px] uppercase tracking-[0.2em]",
        tone === "accent" ? "text-[#c15a3a]" : "text-[#14110e]/55",
        className,
      )}
    >
      {children}
    </div>
  );
}
