import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "text" | "inverse" | "danger";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

const sizes: Record<Size, string> = {
  sm: "px-4 py-1.5 text-[12px]",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-6 py-3.5 text-[14px]",
};

const variants: Record<Variant, string> = {
  primary: "bg-[#14110e] text-[#faf8f5] hover:bg-[#c15a3a]",
  secondary:
    "border border-black/15 text-[#14110e] hover:border-black/30 bg-transparent",
  text: "text-[#c15a3a] hover:text-[#14110e] px-0 py-0",
  inverse: "bg-[#faf8f5] text-[#14110e] hover:bg-white",
  danger: "bg-[#c15a3a] text-[#faf8f5] hover:bg-[#a34a2f]",
};

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

type LinkButtonProps = CommonProps & {
  href: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href">;

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
