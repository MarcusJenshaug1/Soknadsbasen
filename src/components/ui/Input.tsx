import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "box" | "underline";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  variant?: Variant;
  hint?: string;
  error?: string;
};

export function Input({
  label,
  variant = "box",
  hint,
  error,
  className,
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? React.useId();

  const boxStyle =
    "w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#c15a3a]";
  const underlineStyle =
    "w-full bg-transparent border-b border-black/15 focus:border-[#c15a3a] py-2.5 outline-none text-[15px]";

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] uppercase tracking-[0.12em] text-[#14110e]/55 block mb-2"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          variant === "underline" ? underlineStyle : boxStyle,
          error && "border-[#c15a3a]",
          className,
        )}
        {...rest}
      />
      {hint && !error && (
        <p className="text-[11px] text-[#14110e]/50 mt-2">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-[#c15a3a] mt-2">{error}</p>
      )}
    </div>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export function Textarea({ label, hint, className, id, ...rest }: TextareaProps) {
  const inputId = id ?? React.useId();
  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] uppercase tracking-[0.12em] text-[#14110e]/55 block mb-2"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#c15a3a] resize-none",
          className,
        )}
        {...rest}
      />
      {hint && <p className="text-[11px] text-[#14110e]/50 mt-2">{hint}</p>}
    </div>
  );
}
