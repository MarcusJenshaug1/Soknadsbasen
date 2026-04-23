import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  href = "/",
  size = "md",
  tone = "ink",
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "bg";
  className?: string;
}) {
  const dims =
    size === "lg" ? "w-8 h-8" : size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const inner =
    size === "lg" ? "w-2.5 h-2.5" : size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  const text =
    size === "lg" ? "text-[17px]" : size === "sm" ? "text-[13px]" : "text-[14px]";

  const mark =
    tone === "bg"
      ? "bg-[#faf8f5]"
      : "bg-[#14110e]";
  const dot =
    tone === "bg" ? "bg-[#14110e]" : "bg-[#faf8f5]";
  const textColor = tone === "bg" ? "text-[#faf8f5]" : "text-[#14110e]";

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 shrink-0", className)}
    >
      <span
        className={cn("rounded-full flex items-center justify-center", dims, mark)}
      >
        <span className={cn("rounded-full", inner, dot)} />
      </span>
      <span className={cn("font-medium tracking-tight", text, textColor)}>
        søknadsbasen
      </span>
    </Link>
  );
}
