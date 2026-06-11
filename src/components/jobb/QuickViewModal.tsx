"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiX } from "react-icons/fi";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hurtigvisnings-modalen for intercepted /jobb/[slug]: alltid åpen (ruten
 * styrer synlighet), lukk = router.back() så listen gjenoppstår med bevart
 * scroll. Egen lett dialog-mekanikk (Escape, fokus-trap, scroll-lock) i
 * stedet for ui/Modal — denne har ikke open/onClose-livssyklusen.
 */
export function QuickViewModal({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    panel?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.back();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const f = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 sm:py-14"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Lukk hurtigvisning"
        onClick={() => router.back()}
        className="fixed inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-[640px] rounded-3xl border border-border bg-surface shadow-[0_30px_90px_-20px_rgba(20,17,14,0.4)] outline-none motion-safe:animate-[quickview-in_0.18s_ease-out]"
      >
        <button
          type="button"
          aria-label="Lukk"
          onClick={() => router.back()}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted outline-none transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <FiX size={17} aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}
