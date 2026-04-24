"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconClose } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/Pill";
import { useSessionStore } from "@/store/useSessionStore";
import { cn } from "@/lib/cn";

const INPUT =
  "w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#D5592E]";
const LABEL = "text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-1.5";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewSessionModal({ open, onClose }: Props) {
  const router = useRouter();
  const create = useSessionStore((s) => s.create);

  const now = new Date();
  const monthNames = [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember",
  ];
  const defaultName = `Jobbsøk ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Gi sesjonen et navn.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await create({ name: name.trim(), notes: notes.trim() || undefined });
      router.refresh();
      onClose();
      setName(defaultName);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#14110e]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#faf8f5] rounded-3xl w-full max-w-[480px] border border-black/8">
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/8">
          <div>
            <SectionLabel>Ny sesjon</SectionLabel>
            <h2 className="text-[20px] font-medium tracking-tight mt-1">
              Start ny jobbsøk
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60"
            aria-label="Lukk"
          >
            <IconClose size={18} />
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Navn på sesjonen</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
              autoFocus
            />
          </div>
          <div>
            <label className={LABEL}>Notater (valgfritt)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hva er målet med denne søkerunden?"
              className={cn(INPUT, "resize-none")}
            />
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-[#D5592E]/10 border border-[#D5592E]/30 text-[12px] text-[#D5592E]">
              {error}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-black/8 flex items-center justify-end gap-2 bg-[#eee9df]/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-[12px] border border-black/15 hover:border-black/30"
          >
            Avbryt
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-5 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] text-[12px] font-medium hover:bg-[#a94424] disabled:opacity-50"
          >
            {saving ? "Starter …" : "Start sesjon"}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
