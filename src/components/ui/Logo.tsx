import Link from "next/link";
import { cn } from "@/lib/cn";

type LogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "bg";
  className?: string;
};

export function Logo({
  href = "/",
  size = "md",
  tone = "ink",
  className,
}: LogoProps) {
  const mark =
    size === "lg" ? "w-8 h-8" : size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const text =
    size === "lg" ? "text-[17px]" : size === "sm" ? "text-[13px]" : "text-[14px]";

  const leafFill = tone === "bg" ? "#faf8f5" : "#D5592E";
  const foldFill = tone === "bg" ? "rgba(20,17,14,0.25)" : "#A94424";
  const textColor = tone === "bg" ? "text-bg" : "text-ink";

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 shrink-0", className)}
      aria-label="Søknadsbasen"
    >
      <svg
        className={mark}
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        aria-hidden="true"
      >
        <path
          d="M10 3 C25 3 29 7 29 16 C29 25 25 29 16 29 L10 29 L3 22 L3 10 C3 6 5 3 10 3 Z"
          fill={leafFill}
        />
        <path d="M3 22 L10 29 L3 29 Z" fill={foldFill} />
      </svg>
      <span className={cn("font-medium tracking-tight", text, textColor)}>
        Søknadsbasen
      </span>
    </Link>
  );
}
