"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Stack over åpne modaler. Begge nivåer lytter på `document`, så Escape ville
// ellers nå begge lyttere samtidig (stopPropagation virker ikke mellom to
// document-lyttere) og lukke både en nested ConfirmDialog OG forelderen. Kun
// den øverste modalen i stacken reagerer på Escape.
const modalStack: object[] = [];

/**
 * Tynn a11y-wrapper rundt eksisterende modal-markup. Gir scrim, role="dialog",
 * aria-modal, Escape-til-lukk, focus-trap, scroll-lock og fokus-retur — slik at
 * hver konsument slipper å reimplementere dette. Konsumenten beholder sin egen
 * indre markup (header/X/innhold) via children og styler panelet via
 * `panelClassName`. Sett `data-autofocus` på et element for å fokusere det ved
 * åpning (ellers fokuseres første fokuserbare element).
 */
export function Modal({
  open,
  onClose,
  children,
  ariaLabel,
  panelClassName,
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  panelClassName?: string;
  closeOnBackdrop?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Stabil token som identifiserer denne modalen i modalStack.
  const stackTokenRef = useRef<object>({});
  // onClose holdes i en ref så fokus-/scroll-effekten kun avhenger av [open].
  // Ellers re-kjører effekten hver gang en konsument sender en ny onClose-
  // identitet (inline-arrow), og cleanup/re-run stjeler fokus ut av input-felt
  // ved hvert tastetrykk.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const token = stackTokenRef.current;
    modalStack.push(token);

    const preferred = panel?.querySelector<HTMLElement>("[data-autofocus]");
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (preferred ?? (focusables && focusables.length ? focusables[0] : panel))?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Bare den øverste modalen reagerer — ellers lukker Escape også
        // en eventuell forelder-modal under denne.
        if (modalStack[modalStack.length - 1] !== token) return;
        e.stopPropagation();
        onCloseRef.current();
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
      const idx = modalStack.indexOf(token);
      if (idx !== -1) modalStack.splice(idx, 1);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn("relative outline-none", panelClassName)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
