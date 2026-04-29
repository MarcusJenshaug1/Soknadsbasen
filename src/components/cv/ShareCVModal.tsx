"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Trash2, Eye, X, Plus } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { buildShareUrl } from "@/lib/shareUrl";

interface ShareLink {
  id: string;
  token: string;
  resumeId: string;
  resumeName: string | null;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "create" | "list";
type Ttl = 7 | 30 | null;

export function ShareCVModal({ open, onClose }: Props) {
  const resumes = useResumeStore((s) => s.resumes);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);

  const [tab, setTab] = useState<Tab>("create");
  const [resumeId, setResumeId] = useState(activeResumeId);
  const [label, setLabel] = useState("");
  const [ttlDays, setTtlDays] = useState<Ttl>(30);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setListError(null);
    try {
      const res = await fetch("/api/cv/share");
      if (!res.ok) throw new Error("Kunne ikke hente lenker");
      const json = (await res.json()) as { links: ShareLink[] };
      setLinks(json.links);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Ukjent feil");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setResumeId(activeResumeId);
    setLabel("");
    setTtlDays(30);
    setCreatedUrl(null);
    setCreateError(null);
    setTab("create");
    void loadLinks();
  }, [open, activeResumeId, loadLinks]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function createLink() {
    setCreating(true);
    setCreateError(null);
    setCreatedUrl(null);
    try {
      const res = await fetch("/api/cv/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          label: label.trim() || undefined,
          ttlDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          throw new Error("Krever aktivt abonnement. Oppgrader for å dele.");
        }
        throw new Error(json?.error ?? "Kunne ikke opprette lenke");
      }
      const token = json.link.token as string;
      const url = buildShareUrl(token);
      setCreatedUrl(url);
      void loadLinks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(token: string) {
    if (!confirm("Tilbakekalle denne lenken? Mottakere mister tilgang umiddelbart.")) return;
    try {
      const res = await fetch("/api/cv/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Kunne ikke tilbakekalle");
      void loadLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ukjent feil");
    }
  }

  async function copy(text: string, token: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Del CV"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-panel border border-black/10 dark:border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/8 dark:border-white/8">
          <h2 className="text-lg font-semibold text-ink">Del CV</h2>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-ink/60 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex border-b border-black/8 dark:border-white/8">
          <TabBtn active={tab === "create"} onClick={() => setTab("create")}>
            <Plus className="size-4" /> Lag ny
          </TabBtn>
          <TabBtn active={tab === "list"} onClick={() => setTab("list")}>
            <Eye className="size-4" /> Mine lenker {links ? `(${links.filter(isActive).length})` : ""}
          </TabBtn>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "create" ? (
            <div className="space-y-5">
              <p className="text-sm text-ink/65">
                Lenken viser CV-en din live, slik den er nå og senere. Mottaker trenger ikke konto.
              </p>

              <Field label="Hvilken CV?">
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border border-black/12 dark:border-white/12 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Etikett (valgfritt)" hint="Privat for deg, f.eks. 'Sendt til Aker BP'.">
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-black/12 dark:border-white/12 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                  placeholder="Sendt til …"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={80}
                />
              </Field>

              <Field label="Utløp">
                <div className="flex flex-wrap gap-2">
                  <TtlBtn active={ttlDays === 7} onClick={() => setTtlDays(7)}>7 dager</TtlBtn>
                  <TtlBtn active={ttlDays === 30} onClick={() => setTtlDays(30)}>30 dager</TtlBtn>
                  <TtlBtn active={ttlDays === null} onClick={() => setTtlDays(null)}>Aldri</TtlBtn>
                </div>
              </Field>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                  {createError}
                </p>
              )}

              {createdUrl ? (
                <div className="space-y-2 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    Lenken er klar!
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={createdUrl}
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-black/12 dark:border-white/12 bg-surface text-ink"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={() => copy(createdUrl, "new")}
                      className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 inline-flex items-center gap-2"
                    >
                      {copiedToken === "new" ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copiedToken === "new" ? "Kopiert" : "Kopier"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={createLink}
                  disabled={creating || !resumeId}
                  className="w-full py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 disabled:opacity-60 transition-colors"
                >
                  {creating ? "Oppretter…" : "Opprett lenke"}
                </button>
              )}
            </div>
          ) : (
            <ListPane
              links={links}
              error={listError}
              onCopy={copy}
              onRevoke={revoke}
              copiedToken={copiedToken}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function isActive(l: ShareLink): boolean {
  if (l.revokedAt) return false;
  if (l.expiresAt && new Date(l.expiresAt) < new Date()) return false;
  return true;
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
        active
          ? "text-accent border-b-2 border-accent"
          : "text-ink/60 hover:text-ink border-b-2 border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink/80 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

function TtlBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? "bg-accent text-white border-accent"
          : "bg-surface text-ink border-black/12 dark:border-white/12 hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

function ListPane({
  links,
  error,
  onCopy,
  onRevoke,
  copiedToken,
}: {
  links: ShareLink[] | null;
  error: string | null;
  onCopy: (text: string, token: string) => void;
  onRevoke: (token: string) => void;
  copiedToken: string | null;
}) {
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!links) return <p className="text-sm text-ink/60">Laster…</p>;
  if (links.length === 0) {
    return <p className="text-sm text-ink/60">Du har ingen delingslenker ennå.</p>;
  }

  const fmt = new Intl.DateTimeFormat("no-NO", { dateStyle: "medium" });

  return (
    <ul className="space-y-3">
      {links.map((l) => {
        const active = isActive(l);
        const url = buildShareUrl(l.token);
        return (
          <li
            key={l.id}
            className={`p-4 rounded-xl border ${
              active
                ? "border-black/10 dark:border-white/10 bg-surface"
                : "border-black/8 dark:border-white/8 bg-surface/50 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink truncate">
                    {l.label || l.resumeName || "CV"}
                  </span>
                  {!active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink/10 text-ink/60">
                      {l.revokedAt ? "Tilbakekalt" : "Utløpt"}
                    </span>
                  )}
                </div>
                {l.label && l.resumeName && (
                  <p className="text-xs text-ink/55 mt-0.5">CV: {l.resumeName}</p>
                )}
                <p className="text-xs text-ink/50 mt-1">
                  Opprettet {fmt.format(new Date(l.createdAt))}
                  {l.expiresAt && ` · utløper ${fmt.format(new Date(l.expiresAt))}`}
                  {!l.expiresAt && active && " · utløper aldri"}
                  {" · "}
                  {l.viewCount} visning{l.viewCount === 1 ? "" : "er"}
                </p>
                {active && (
                  <p className="text-xs font-mono text-ink/60 mt-2 truncate">{url}</p>
                )}
              </div>
              {active && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => onCopy(url, l.token)}
                    className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 inline-flex items-center gap-1.5"
                  >
                    {copiedToken === l.token ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copiedToken === l.token ? "Kopiert" : "Kopier"}
                  </button>
                  <button
                    onClick={() => onRevoke(l.token)}
                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="size-3.5" /> Tilbakekall
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
