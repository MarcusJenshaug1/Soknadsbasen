import * as React from "react";
import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "surface" | "panel" | "ink";
  radius?: "2xl" | "3xl";
};

export function Card({
  variant = "surface",
  radius = "2xl",
  className,
  children,
  ...rest
}: CardProps) {
  const variantStyle =
    variant === "panel"
      ? "bg-panel"
      : variant === "ink"
        ? "bg-ink text-bg"
        : "bg-surface border border-black/5 dark:border-white/5";

  const radiusStyle = radius === "3xl" ? "rounded-3xl" : "rounded-2xl";

  return (
    <div className={cn(variantStyle, radiusStyle, className)} {...rest}>
      {children}
    </div>
  );
}
