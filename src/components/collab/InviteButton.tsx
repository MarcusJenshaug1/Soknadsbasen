"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { InviteModal } from "./InviteModal";
import type { CollabResourceKind } from "@/lib/collabToken";

/**
 * Ressurs-spesifikk "Inviter hjelper"-knapp. Brukes i editor-headers
 * (CV, brev, søknad). Pre-fyller resourceKind + resourceId så bruker
 * ikke trenger å velge i modalen.
 */
export function InviteButton({
  resourceKind,
  resourceId,
  resourceTitle,
  variant = "default",
}: {
  resourceKind: CollabResourceKind;
  resourceId: string;
  resourceTitle: string;
  variant?: "default" | "compact";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "compact"
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-black/10 dark:border-white/10 text-[11px] text-ink/75 hover:text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors"
            : "inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-black/10 dark:border-white/10 text-[12px] text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors"
        }
      >
        <UserPlus className="size-3.5" />
        Inviter hjelper
      </button>

      <InviteModal
        open={open}
        onClose={() => setOpen(false)}
        resourceKind={resourceKind}
        resourceId={resourceId}
        resourceTitle={resourceTitle}
      />
    </>
  );
}
