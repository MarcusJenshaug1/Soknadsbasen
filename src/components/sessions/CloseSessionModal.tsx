"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconClose } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/Pill";
import { useSessionStore } from "@/store/useSessionStore";
import { useApplicationStore } from "@/store/useApplicationStore";
import { cn } from "@/lib/cn";

type Outcome = "GOT_JOB" | "PAUSE" | "OTHER";

const OUTCOMES: { value: Outcome; label: string; description: string }[] = [
  { value: "GOT_JOB", label: "Fikk jobb", description: "Én av søknadene i denne perioden førte til ansettelse" },
  { value: "PAUSE", label: "Tar pause", description: "Avbryter søket midlertidig, men vil starte igjen senere" },
  { value: "OTHER", label: "Annet", description: "Avslutter av annen årsak" },
];

const INPUT =
  "w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#D5592E]";
const LABEL = "text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-1.5";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CloseSessionModal({ open, onClose }: Props) {
  const router = useRouter();
  const activeSession = useSessionStore((s) => s.activeSession);
  const close = useSessionStore((s) => s.close);
  const applications = useApplicationStore((s) => s.applications);

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [winningId, setWinningId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftCount = applications.filter(
    (a) => a.status === "draft" && a.sessionId === activeSession?.id,
  ).length;

  const offerApps = applications.filter(
    (a) =>
      (a.status === "offer" || a.status === "accepted") &&
      a.sessionId === activeSession?.id,
  );

  async function handleClose() {
    if (!outcome) { setError("Velg et utfall."); return; }
    if (outcome === "GOT_JOB" && !winningId) { setError("Velg søknaden som førte til jobben."); return; }
    if (!activeSession) return;

    setSaving(true);
    setError(null);
    try {
      await close(activeSession.id, {
        outcome,
        winningApplicationId: outcome === "GOT_JOB" ? winningId : undefined,
        notes: notes.trim() || undefined,
      });
      router.refresh();
      onClose();
      setOutcome(null);
      setWinningId("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !activeSession) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#14110e]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#faf8f5] rounded-3xl w-full max-w-[520px] border border-black/8">
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/8">
          <div>
            <SectionLabel>Avslutt sesjon</SectionLabel>
            <h2 className="text-[20px] font-medium tracking-tight mt-1">
              {activeSession.name}
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

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className={LABEL}>Hva skjedde?</label>
            <div className="space-y-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { setOutcome(o.value); setError(null); }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border transition-colors",
                    outcome === o.value
                      ? "border-[#14110e] bg-[#14110e]/5"
                      : "border-black/10 hover:border-black/25",
                  )}
                >
                  <div className="text-[13px] font-medium">{o.label}</div>
                  <div className="text-[11px] text-[#14110e]/55 mt-0.5">{o.description}</div>
                </button>
              ))}
            </div>
          </div>

          {outcome === "GOT_JOB" && (
            <div>
              <label className={LABEL}>Hvilken søknad fikk du jobb gjennom?</label>
              <select
                value={winningId}
                onChange={(e) => setWinningId(e.target.value)}
                className={INPUT}
              >
                <option value="">Velg søknad …</option>
                {offerApps.length > 0 && (
                  <optgroup label="Tilbud / akseptert">
                    {offerApps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} — {a.companyName}
                      </option>
                    ))}
                  </optgroup>
                )}
                {applications
                  .filter((a) => a.sessionId === activeSession.id && !offerApps.includes(a))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} — {a.companyName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className={LABEL}>Refleksjon (valgfritt)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hva lærte du? Hva ville du gjort annerledes?"
              className={cn(INPUT, "resize-none")}
            />
          </div>

          {draftCount > 0 && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
              {draftCount} utkast-søknad{draftCount > 1 ? "er" : ""} vil bli arkivert automatisk.
            </div>
          )}

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
            onClick={handleClose}
            disabled={saving || !outcome}
            className="px-5 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] text-[12px] font-medium hover:bg-[#a94424] disabled:opacity-50"
          >
            {saving ? "Avslutter …" : "Avslutt sesjon"}
          </button>
        </footer>
      </div>
    </div>
  );
}
