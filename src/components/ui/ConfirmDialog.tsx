"use client";

import { Modal } from "./Modal";
import { cn } from "@/lib/cn";

/**
 * Gjenbrukbar bekreftelses-dialog som erstatter native window.confirm().
 * Bygget på delt Modal-primitiv (Escape/focus-trap/scroll-lock).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Bekreft",
  cancelLabel = "Avbryt",
  danger = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={title}
      panelClassName="bg-bg rounded-3xl w-full max-w-[420px] border border-black/8 dark:border-white/8 shadow-2xl p-6"
    >
      <h2 className="text-[18px] font-medium tracking-tight mb-2">{title}</h2>
      <div className="text-[13px] text-ink/65 leading-relaxed mb-6">{message}</div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 rounded-full text-[12px] border border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          data-autofocus
          className={cn(
            "px-5 py-2 rounded-full text-[12px] font-medium text-bg disabled:opacity-50 transition-colors",
            danger ? "bg-accent hover:bg-accent-hover" : "bg-ink hover:opacity-90",
          )}
        >
          {loading ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
