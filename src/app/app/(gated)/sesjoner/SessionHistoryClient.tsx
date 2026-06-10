"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore, type SessionSummary } from "@/store/useSessionStore";
import { Modal } from "@/components/ui/Modal";
import { SectionLabel } from "@/components/ui/Pill";
import { IconClose, IconPlus } from "@/components/ui/Icons";
import { CloseSessionModal } from "@/components/sessions/CloseSessionModal";
import { NewSessionModal } from "@/components/sessions/NewSessionModal";
import { cn } from "@/lib/cn";

const OUTCOME_LABELS: Record<string, string> = {
  GOT_JOB: "Fikk jobb",
  PAUSE: "Tok pause",
  OTHER: "Avsluttet",
};

const INPUT =
  "w-full bg-surface border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent";
const LABEL =
  "text-[11px] uppercase tracking-wider text-ink/55 block mb-1.5";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Autoritativ klient-flate for sesjons-livssyklus. Seeder fra server-rendret
 * `initialSessions` (ingen flash) og holder seg synk med useSessionStore for at
 * Start ny / Avslutt / Gjenåpne / Gi nytt navn skal reflekteres umiddelbart.
 * Switcher-komponentene (sidebar/mobil) er bevisst forenklet til bytting +
 * lenke hit — denne siden eier handlingene.
 */
export function SessionHistoryClient({
  initialSessions,
}: {
  initialSessions: SessionSummary[];
}) {
  const router = useRouter();
  const storeSessions = useSessionStore((s) => s.sessions);
  const isLoading = useSessionStore((s) => s.isLoading);
  const load = useSessionStore((s) => s.load);
  const reopen = useSessionStore((s) => s.reopen);
  const rename = useSessionStore((s) => s.rename);

  const [hydrated, setHydrated] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().finally(() => setHydrated(true));
  }, [load]);

  // Server-data er sannhet ved første render; etter load() tar store-en over så
  // livssyklus-endringer (avslutt/gjenåpne/navn) vises uten full refresh.
  const sessions = hydrated ? storeSessions : initialSessions;
  const activeSession = sessions.find((s) => s.status === "ACTIVE") ?? null;

  async function handleReopen(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await reopen(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke gjenåpne");
    } finally {
      setBusyId(null);
    }
  }

  if (!hydrated && initialSessions.length === 0 && isLoading) {
    return null;
  }

  return (
    <>
      <div className="mt-10 mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[18px] font-medium">Alle sesjoner</h2>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-accent-hover transition-colors"
        >
          <IconPlus size={14} />
          Ny sesjon
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-[12px] text-accent">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-[13px] text-ink/55 py-12 text-center">
          Ingen sesjoner ennå. Trykk «Ny sesjon» for å starte din første søkerunde.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const start = formatDate(s.startedAt);
            const end = s.closedAt ? formatDate(s.closedAt) : null;
            const isActive = s.status === "ACTIVE";

            return (
              <div
                key={s.id}
                className={cn(
                  "border rounded-2xl px-5 py-4 bg-surface transition-colors",
                  isActive
                    ? "border-success/40 hover:border-success/60"
                    : "border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-medium">{s.name}</span>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-medium">
                          Aktiv
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-panel text-ink/55 text-[10px]">
                          {s.outcome ? OUTCOME_LABELS[s.outcome] : "Avsluttet"}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-ink/50">
                      {start}
                      {end ? ` til ${end}` : ""}
                      {" · "}
                      {s._count.applications} søknader
                    </div>
                    {s.notes && (
                      <div className="text-[12px] text-ink/65 mt-1.5 italic">
                        {s.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/app/pipeline?session=${s.id}`}
                      prefetch={true}
                      className="px-3 py-1.5 rounded-full text-[12px] border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 transition-colors"
                    >
                      Se pipeline
                    </Link>
                    {isActive ? (
                      <>
                        <button
                          onClick={() => setRenamingId(s.id)}
                          className="px-3 py-1.5 rounded-full text-[12px] border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 transition-colors"
                        >
                          Gi nytt navn
                        </button>
                        <button
                          onClick={() => setClosingId(s.id)}
                          className="px-3 py-1.5 rounded-full text-[12px] text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent/8 transition-colors"
                        >
                          Avslutt
                        </button>
                      </>
                    ) : (
                      !activeSession && (
                        <button
                          onClick={() => handleReopen(s.id)}
                          disabled={busyId === s.id}
                          className="px-3 py-1.5 rounded-full text-[12px] border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 transition-colors disabled:opacity-50"
                        >
                          {busyId === s.id ? "…" : "Gjenåpne"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewSessionModal open={showNew} onClose={() => setShowNew(false)} />

      {/* CloseSessionModal opererer på activeSession i store-en. */}
      <CloseSessionModal
        open={closingId !== null}
        onClose={() => setClosingId(null)}
      />

      <RenameSessionModal
        session={sessions.find((s) => s.id === renamingId) ?? null}
        onClose={() => setRenamingId(null)}
        onSubmit={async (name) => {
          if (!renamingId) return;
          await rename(renamingId, name);
          router.refresh();
          setRenamingId(null);
        }}
      />
    </>
  );
}

function RenameSessionModal({
  session,
  onClose,
  onSubmit,
}: {
  session: SessionSummary | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      setName(session.name);
      setError(null);
    }
  }, [session]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Gi sesjonen et navn.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke gi nytt navn");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={session !== null}
      onClose={onClose}
      ariaLabel="Gi nytt navn til sesjon"
      panelClassName="bg-bg rounded-3xl w-full max-w-[440px] border border-black/8 dark:border-white/8"
    >
      <header className="flex items-center justify-between px-6 py-4 border-b border-black/8 dark:border-white/8">
        <div>
          <SectionLabel>Gi nytt navn</SectionLabel>
          <h2 className="text-[20px] font-medium tracking-tight mt-1">
            Endre sesjonsnavn
          </h2>
        </div>
        <button
          onClick={onClose}
          className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-ink/60"
          aria-label="Lukk"
        >
          <IconClose size={18} />
        </button>
      </header>

      <div className="px-6 py-5">
        <label className={LABEL} htmlFor="session-rename-input">
          Navn på sesjonen
        </label>
        <input
          id="session-rename-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className={INPUT}
          autoFocus
        />
        {error && (
          <div className="mt-3 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-[12px] text-accent">
            {error}
          </div>
        )}
      </div>

      <footer className="px-6 py-4 border-t border-black/8 dark:border-white/8 flex items-center justify-end gap-2 bg-panel/40">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-full text-[12px] border border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30"
        >
          Avbryt
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Lagrer …" : "Lagre"}
        </button>
      </footer>
    </Modal>
  );
}
