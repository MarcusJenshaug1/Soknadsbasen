"use client";

import { useState } from "react";
import { FiSliders } from "react-icons/fi";

import { Modal } from "@/components/ui/Modal";

/**
 * Mobil: «Filtre»-knapp som åpner bottom sheet med samme server-rendrede
 * sidebar-innhold (children). Sheeten er klient-state og overlever RSC-
 * re-render, så counts oppdaterer seg live bak åpen sheet; sticky bunnknapp
 * viser gjeldende treffantall.
 */
export function MobileFilterSheet({
  total,
  activeCount,
  children,
}: {
  total: number;
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[44px] items-center gap-2 rounded-full border border-border-strong bg-surface px-4 text-[13px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <FiSliders size={14} aria-hidden />
        Filtre
        {activeCount > 0 && (
          <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Filtre"
        placement="bottom"
        panelClassName="w-full"
      >
        <div className="grid max-h-[88dvh] w-full grid-rows-[auto_1fr_auto] rounded-t-3xl bg-bg">
          <div className="flex justify-center pb-1 pt-3">
            <span aria-hidden className="h-1 w-10 rounded-full bg-border-strong" />
          </div>
          <div className="overflow-y-auto px-4 pb-2">{children}</div>
          <div className="border-t border-border bg-bg p-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-[46px] w-full rounded-full bg-ink text-[14px] font-medium text-bg outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Vis {total.toLocaleString("nb-NO")} treff
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
