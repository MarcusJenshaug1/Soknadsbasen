"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  X,
  Check,
  Trash2,
  Link2,
  Users,
  ChevronDown,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  COLLAB_INVITE_TTL_OPTIONS,
  type CollabResourceKind,
} from "@/lib/collabToken";

/**
 * InviteModal: åpnes fra en ressurs-spesifikk knapp (CV, brev, søknad).
 * Pre-fyller resourceKind + resourceId, så bruker velger bare TTL og
 * (valgfri) label. Viser også alle aktive invitasjoner for ressursen så
 * eier kan revoke eller kopiere URL.
 */

type InviteRow = {
  id: string;
  token: string;
  resourceKind: CollabResourceKind;
  resourceId: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  activeSessions: number;
  pendingSuggestions: number;
};

function isArchived(inv: InviteRow): boolean {
  if (inv.revokedAt) return true;
  if (inv.expiresAt && new Date(inv.expiresAt).getTime() <= Date.now()) return true;
  return false;
}

export function InviteModal({
  open,
  onClose,
  resourceKind,
  resourceId,
  resourceTitle,
}: {
  open: boolean;
  onClose: () => void;
  resourceKind: CollabResourceKind;
  resourceId: string;
  /** Vises i header — "CV", "Søknadsbrev hos X", "Søknad: Y" etc. */
  resourceTitle: string;
}) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ttlHours, setTtlHours] = useState<number | null>(7 * 24);
  const [label, setLabel] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { activeInvites, archivedInvites } = useMemo(() => {
    const active: InviteRow[] = [];
    const archived: InviteRow[] = [];
    for (const inv of invites) {
      (isArchived(inv) ? archived : active).push(inv);
    }
    return { activeInvites: active, archivedInvites: archived };
  }, [invites]);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/collab/invite?kind=${resourceKind}&resourceId=${encodeURIComponent(resourceId)}&includeArchived=1`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { invites: InviteRow[] };
      setInvites(data.invites);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }, [resourceKind, resourceId]);

  useEffect(() => {
    if (!open) return;
    fetchInvites();
  }, [open, fetchInvites]);

  async function createInvite() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/collab/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceKind,
          resourceId,
          ttlHours,
          label: label.trim() || null,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      setLabel("");
      await fetchInvites();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke opprette lenke");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/collab/invite/${id}`, { method: "DELETE" });
    if (res.ok) await fetchInvites();
  }

  async function copy(token: string) {
    const fullUrl = `${window.location.origin}/collab/${resourceKind}/${token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback: prompt
      prompt("Kopier denne lenken:", fullUrl);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Inviter hjelper"
      panelClassName="w-full max-w-[600px] max-h-[88vh] overflow-y-auto rounded-2xl bg-bg shadow-2xl border border-black/10"
    >
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-black/8 px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
              Inviter hjelper
            </div>
            <h2 className="text-[18px] md:text-[20px] font-medium tracking-tight text-ink truncate">
              {resourceTitle}
            </h2>
            <p className="text-[12px] text-[#14110e]/60 mt-1 leading-[1.5]">
              Alle med lenken kan foreslå endringer. Du må godkjenne eller avvise hvert forslag.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60 hover:text-ink transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Opprett ny lenke */}
          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/55 font-medium">
              Ny lenke
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-[#14110e]/55 mb-1">
                  Navn på lenken (valgfritt)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Mamma, Per fra karriere-kontoret …"
                  className="w-full border-b border-black/15 bg-transparent py-2 text-[13px] outline-none focus:border-ink"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#14110e]/55 mb-1">
                  Utløper
                </label>
                <select
                  value={String(ttlHours)}
                  onChange={(e) =>
                    setTtlHours(e.target.value === "null" ? null : Number(e.target.value))
                  }
                  className="border border-black/15 rounded-lg px-3 py-2 text-[13px] bg-bg outline-none focus:border-ink"
                >
                  {COLLAB_INVITE_TTL_OPTIONS.map((opt) => (
                    <option key={opt.label} value={String(opt.hours)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={createInvite}
              disabled={creating}
              className={cn(
                "w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium",
                "bg-accent text-bg hover:bg-[#a94424] transition-colors",
                "disabled:opacity-40",
              )}
            >
              <Link2 size={14} />
              {creating ? "Genererer …" : "Opprett invitasjon"}
            </button>
            {error && (
              <p className="text-[12px] text-red-600">{error}</p>
            )}
          </section>

          {/* Aktive lenker */}
          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/55 font-medium">
              Aktive lenker {activeInvites.length > 0 && `(${activeInvites.length})`}
            </h3>
            {loading && invites.length === 0 && (
              <p className="text-[12px] text-[#14110e]/45">Laster …</p>
            )}
            {!loading && activeInvites.length === 0 && (
              <p className="text-[12px] text-[#14110e]/45 italic">Ingen aktive invitasjoner.</p>
            )}
            <ul className="space-y-2">
              {activeInvites.map((inv) => {
                const exp = inv.expiresAt ? new Date(inv.expiresAt) : null;
                const expSoon = exp && exp.getTime() - Date.now() < 24 * 60 * 60_000;
                return (
                  <li
                    key={inv.id}
                    className="rounded-xl border border-black/8 bg-surface p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-ink truncate">
                          {inv.label ?? "Uten navn"}
                        </div>
                        <div className="text-[11px] text-[#14110e]/55 mt-0.5 flex items-center gap-3 flex-wrap">
                          {exp ? (
                            <span className={expSoon ? "text-amber-600" : ""}>
                              Utløper {exp.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                            </span>
                          ) : (
                            <span>Aldri utløp</span>
                          )}
                          {inv.activeSessions > 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <Users size={11} />
                              {inv.activeSessions} aktiv
                              {inv.activeSessions !== 1 ? "e" : ""}
                            </span>
                          )}
                          {inv.pendingSuggestions > 0 && (
                            <span className="text-accent">
                              {inv.pendingSuggestions} ventende
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copy(inv.token)}
                          title="Kopier lenke"
                          className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60 hover:text-ink"
                        >
                          {copiedToken === inv.token ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(inv.id)}
                          title="Trekk tilbake"
                          className="size-8 rounded-full hover:bg-red-50 flex items-center justify-center text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Utløpte og tilbakekalte lenker (arkiv) */}
          {archivedInvites.length > 0 && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                className="w-full flex items-center justify-between gap-2 text-left group"
              >
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#14110e]/40 font-medium group-hover:text-[#14110e]/60 transition-colors">
                  <Archive size={12} />
                  Utløpte og tilbakekalte ({archivedInvites.length})
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-[#14110e]/40 transition-transform",
                    showArchived && "rotate-180",
                  )}
                />
              </button>
              {showArchived && (
                <ul className="space-y-2">
                  {archivedInvites.map((inv) => {
                    const exp = inv.expiresAt ? new Date(inv.expiresAt) : null;
                    const revoked = inv.revokedAt !== null;
                    return (
                      <li
                        key={inv.id}
                        className="rounded-xl border border-black/8 bg-surface/50 p-3 opacity-70"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-[#14110e]/55 truncate">
                              {inv.label ?? "Uten navn"}
                            </div>
                            <div className="text-[11px] text-[#14110e]/45 mt-0.5 flex items-center gap-2 flex-wrap">
                              {revoked ? (
                                <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-medium">
                                  Tilbakekalt
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-black/8 text-[#14110e]/60 px-2 py-0.5 text-[10px] font-medium">
                                  Utløpt
                                </span>
                              )}
                              {exp && (
                                <span>
                                  Utløp {exp.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        <ConfirmDialog
          open={confirmId !== null}
          onClose={() => setConfirmId(null)}
          onConfirm={() => {
            void revoke(confirmId!);
            setConfirmId(null);
          }}
          title="Trekk tilbake lenke"
          message="Mottakere mister tilgang umiddelbart. Dette kan ikke angres."
          confirmLabel="Trekk tilbake"
          danger
        />
    </Modal>
  );
}
