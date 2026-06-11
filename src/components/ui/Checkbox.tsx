"use client";

import { FiCheck } from "react-icons/fi";

import { cn } from "@/lib/cn";

/**
 * Checkbox-/radio-rad for filtergrupper (designreferansen: 17px boks,
 * rounded-[5px], radio-rund for single-grupper, rad-hover, count i
 * tabular-nums). Hele raden er label = touch-mål ≥ 44px. Native input
 * (sr-only) gir tastatur + skjemaleser + no-JS GET-fallback via name/value.
 */
export function CheckboxRow({
  label,
  checked,
  count,
  onChange,
  single = false,
  name,
  value,
  dimmed = false,
}: {
  label: string;
  checked: boolean;
  count?: number;
  onChange: () => void;
  /** Radio-semantikk (publisert): rund markør i stedet for hake. */
  single?: boolean;
  /** name/value for no-JS GET-form-fallback. */
  name?: string;
  value?: string;
  dimmed?: boolean;
}) {
  return (
    <label
      className={cn(
        "-mx-2 flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-panel",
        dimmed && "opacity-45",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        name={name}
        value={value}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex h-[17px] w-[17px] shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg",
          single ? "rounded-full" : "rounded-[5px]",
          checked ? "border-ink bg-ink text-bg" : "border-border-strong bg-surface",
        )}
      >
        {checked &&
          (single ? (
            <span className="h-1.5 w-1.5 rounded-full bg-bg" />
          ) : (
            <FiCheck size={11} strokeWidth={3} />
          ))}
      </span>
      <span className="flex-1 text-[13px] leading-snug text-ink">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-[11.5px] tabular-nums",
            dimmed ? "text-ink-faint" : "text-ink-muted",
          )}
        >
          ({count.toLocaleString("nb-NO")})
        </span>
      )}
    </label>
  );
}
