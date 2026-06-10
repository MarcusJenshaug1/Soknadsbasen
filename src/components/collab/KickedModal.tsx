"use client";

import Link from "next/link";

import { Modal } from "@/components/ui/Modal";

/**
 * Vises når en anonym sesjon disconnectes — typisk fordi eier
 * revoked invite eller kicket sesjonen. Sluttskjerm; ingen reconnect.
 */
export function KickedModal({
  ownerDisplayName,
  reason = "ended",
}: {
  ownerDisplayName?: string;
  reason?: "ended" | "expired";
}) {
  return (
    <Modal
      open={true}
      onClose={() => {}}
      closeOnBackdrop={false}
      ariaLabel="Tilgang avsluttet"
      panelClassName="w-full max-w-[420px] rounded-2xl bg-bg shadow-2xl border border-black/10 p-6 text-center"
    >
      <div className="size-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 mb-4">
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 className="text-[18px] font-medium text-ink mb-2">
        Takk for hjelpen!
      </h2>
      <p className="text-[13px] text-[#14110e]/65 leading-[1.55] mb-5">
        {reason === "expired"
          ? "Lenken er utløpt."
          : ownerDisplayName
            ? `${ownerDisplayName} har avsluttet din tilgang.`
            : "Eier har avsluttet din tilgang."}
      </p>
      <Link
        href="/"
        className="inline-flex px-5 py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium hover:bg-[#2a2520]"
      >
        Lukk
      </Link>
    </Modal>
  );
}
