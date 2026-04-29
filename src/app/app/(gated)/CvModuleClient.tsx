"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Trash2,
  Plus,
  Pencil,
  Share2,
  Eye,
  ExternalLink,
  FileText,
} from "lucide-react";
import { SectionLabel } from "@/components/ui/Pill";
import { ShareCVModal } from "@/components/cv/ShareCVModal";

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

interface Resume {
  id: string;
  name: string;
}

interface Props {
  resumes: Resume[];
  initialLinks: ShareLink[];
  activeLinkCount: number;
  lastEdited: string | null;
}

function isActive(l: ShareLink): boolean {
  if (l.revokedAt) return false;
  if (l.expiresAt && new Date(l.expiresAt) < new Date()) return false;
  return true;
}

function relativeNo(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.round(diffMs / 86_400_000);
  if (days < 1) return "i dag";
  if (days === 1) return "i går";
  if (days < 30) return `${days} dager siden`;
  if (days < 365) return `${Math.round(days / 30)} mnd siden`;
  return `${Math.round(days / 365)} år siden`;
}

function expiryNo(iso: string | null): string {
  if (!iso) return "utløper aldri";
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diffMs / 86_400_000);
  if (days <= 0) return "utløpt";
  if (days === 1) return "utløper i morgen";
  return `utløper om ${days} dager`;
}

export function CvModuleClient({
  resumes,
  initialLinks,
  activeLinkCount,
  lastEdited,
}: Props) {
  const [links, setLinks] = useState<ShareLink[]>(initialLinks);
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const activeLinks = useMemo(() => links.filter(isActive), [links]);
  const totalViews = useMemo(
    () => links.reduce((acc, l) => acc + l.viewCount, 0),
    [links],
  );

  const refreshLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/cv/share");
      if (!res.ok) return;
      const json = (await res.json()) as { links: ShareLink[] };
      setLinks(json.links);
    } catch {
      // silent
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setShareOpen(false);
    void refreshLinks();
  }, [refreshLinks]);

  async function copy(text: string, token: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 1500);
    } catch {
      // ignore
    }
  }

  async function revoke(token: string) {
    if (
      !confirm(
        "Tilbakekalle denne lenken? Mottakere mister tilgang umiddelbart.",
      )
    )
      return;
    setRevoking(token);
    try {
      const res = await fetch("/api/cv/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Kunne ikke tilbakekalle");
      await refreshLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setRevoking(null);
    }
  }

  const lastEditedText = relativeNo(lastEdited);
  const previewLinks = activeLinks.slice(0, 3);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div>
          <SectionLabel className="mb-2">CV-modul</SectionLabel>
          <h2 className="text-[22px] md:text-[24px] tracking-tight font-medium">
            Dine CV-er og delinger
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/cv"
            className="px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-[13px] hover:border-black/30 dark:hover:border-white/30 transition-colors inline-flex items-center gap-2"
          >
            <Pencil className="size-3.5" />
            Rediger CV
          </Link>
          <button
            onClick={() => setShareOpen(true)}
            className="px-4 py-2 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors inline-flex items-center gap-2"
          >
            <Share2 className="size-3.5" />
            Ny delingslenke
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* CVer-kort */}
        <div className="md:col-span-6 bg-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-5">
            <SectionLabel>CV-er</SectionLabel>
            <span className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45">
              {resumes.length} {resumes.length === 1 ? "stk" : "stk"}
            </span>
          </div>

          {resumes.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-5" />}
              text="Ingen CV ennå."
              ctaHref="/app/cv"
              ctaText="Opprett din første CV"
            />
          ) : (
            <ul className="space-y-2">
              {resumes.map((r) => {
                const linkCount = activeLinks.filter(
                  (l) => l.resumeId === r.id,
                ).length;
                return (
                  <li
                    key={r.id}
                    className="group flex items-center gap-3 p-3 rounded-2xl bg-surface hover:bg-bg transition-colors"
                  >
                    <div className="size-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium text-ink truncate">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mt-0.5">
                        {linkCount > 0
                          ? `${linkCount} aktiv${linkCount === 1 ? "" : "e"} lenke${linkCount === 1 ? "" : "r"}`
                          : "Ingen aktive lenker"}
                      </div>
                    </div>
                    <Link
                      href="/app/cv"
                      aria-label={`Rediger ${r.name}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-3 py-1.5 rounded-full border border-black/12 dark:border-white/12 text-[12px] hover:border-black/30 dark:hover:border-white/30 transition inline-flex items-center gap-1.5"
                    >
                      <Pencil className="size-3" />
                      Rediger
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {lastEditedText && resumes.length > 0 && (
            <p className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45 mt-4">
              Sist redigert {lastEditedText}
            </p>
          )}
        </div>

        {/* Lenker-kort */}
        <div className="md:col-span-6 bg-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-5">
            <SectionLabel>Aktive lenker</SectionLabel>
            <span className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45 inline-flex items-center gap-1">
              <Eye className="size-3" />
              {totalViews} visninger totalt
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-[48px] md:text-[56px] leading-none tracking-[-0.03em] font-medium">
              {activeLinkCount}
            </span>
            <span className="text-[14px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
              {activeLinkCount === 1 ? "aktiv lenke" : "aktive lenker"}
            </span>
          </div>

          {activeLinks.length === 0 ? (
            <EmptyState
              icon={<Share2 className="size-5" />}
              text="Ingen aktive delingslenker."
              onClick={() => setShareOpen(true)}
              ctaText="Lag din første lenke"
            />
          ) : (
            <>
              <ul className="space-y-2">
                {previewLinks.map((l) => {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/cv/delt/${l.token}`
                      : `/cv/delt/${l.token}`;
                  const title = l.label || l.resumeName || "CV";
                  return (
                    <li
                      key={l.id}
                      className="p-3 rounded-2xl bg-surface flex items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] font-medium text-ink truncate">
                            {title}
                          </span>
                          {l.label && l.resumeName && (
                            <span className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45 truncate">
                              · {l.resumeName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mt-0.5">
                          <span>{expiryNo(l.expiresAt)}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="size-3" />
                            {l.viewCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => copy(url, l.token)}
                          aria-label="Kopier lenke"
                          className="size-8 rounded-full bg-bg hover:bg-ink hover:text-bg transition-colors inline-flex items-center justify-center"
                        >
                          {copiedToken === l.token ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                        <a
                          href={`/cv/delt/${l.token}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Åpne forhåndsvisning"
                          className="size-8 rounded-full bg-bg hover:bg-ink hover:text-bg transition-colors inline-flex items-center justify-center"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                        <button
                          onClick={() => revoke(l.token)}
                          disabled={revoking === l.token}
                          aria-label="Tilbakekall lenke"
                          className="size-8 rounded-full bg-bg hover:bg-red-600 hover:text-bg transition-colors inline-flex items-center justify-center disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between mt-4">
                {activeLinks.length > previewLinks.length ? (
                  <button
                    onClick={() => setShareOpen(true)}
                    className="text-[13px] text-accent hover:text-ink"
                  >
                    Se alle {activeLinks.length} →
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => setShareOpen(true)}
                  className="text-[13px] inline-flex items-center gap-1.5 text-[#14110e]/70 dark:text-[#f0ece6]/70 hover:text-ink"
                >
                  <Plus className="size-3.5" />
                  Ny lenke
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ShareCVModal open={shareOpen} onClose={handleCloseModal} />
    </section>
  );
}

function EmptyState({
  icon,
  text,
  ctaHref,
  ctaText,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  ctaHref?: string;
  ctaText: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="size-10 rounded-2xl bg-surface text-[#14110e]/40 dark:text-[#f0ece6]/40 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-[13px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-3">
        {text}
      </p>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className="px-4 py-2 rounded-full bg-ink text-bg text-[12px] font-medium hover:opacity-90"
        >
          {ctaText}
        </Link>
      ) : (
        <button
          onClick={onClick}
          className="px-4 py-2 rounded-full bg-ink text-bg text-[12px] font-medium hover:opacity-90"
        >
          {ctaText}
        </button>
      )}
    </div>
  );
}
