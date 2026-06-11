"use client";

import { useId, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

import { cn } from "@/lib/cn";

/**
 * Collapsible seksjon med aria-expanded/aria-controls og chevron-rotasjon
 * (motion-safe). Ukontrollert med defaultOpen — klient-state overlever RSC-
 * re-render ved filterklikk, så åpne grupper forblir åpne.
 */
export function Collapsible({
  header,
  children,
  defaultOpen = false,
  className,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
          {header}
        </span>
        <FiChevronDown
          size={14}
          aria-hidden
          className={cn(
            "shrink-0 text-ink-muted transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <div id={regionId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
