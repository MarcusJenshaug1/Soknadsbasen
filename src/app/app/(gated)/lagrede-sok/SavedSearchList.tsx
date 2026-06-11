"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FiExternalLink, FiTrash2 } from "react-icons/fi";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteSavedSearch,
  updateSavedSearch,
} from "@/lib/jobs/saved-search-actions";

type SavedSearchVM = {
  id: string;
  name: string;
  query: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailFrequency: string;
  createdAt: string;
  hitCount: number;
};

/** Administrasjon av lagrede søk: kanal-toggles, frekvens, slett. */
export function SavedSearchList({ searches }: { searches: SavedSearchVM[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {searches.map((s) => (
        <SavedSearchRow key={s.id} search={s} />
      ))}
    </ul>
  );
}

function SavedSearchRow({ search }: { search: SavedSearchVM }) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Parameters<typeof updateSavedSearch>[1]) =>
    startTransition(async () => {
      setError(null);
      const res = await updateSavedSearch(search.id, p);
      if (!res.ok) setError(res.error);
    });

  return (
    <li
      className="rounded-2xl border border-border bg-surface px-5 py-4"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium text-ink">{search.name}</h2>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {search.hitCount.toLocaleString("nb-NO")} treff varslet ·{" "}
            <Link
              href={search.query ? `/jobb?${search.query}` : "/jobb"}
              className="inline-flex items-center gap-1 text-accent-ink underline-offset-2 hover:underline"
            >
              Åpne søket <FiExternalLink size={11} aria-hidden />
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label={`Slett søket ${search.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted outline-none transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <FiTrash2 size={15} aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
        <ChannelToggle
          label="E-post"
          checked={search.emailEnabled}
          onChange={(v) => patch({ emailEnabled: v })}
        />
        {search.emailEnabled && (
          <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            Frekvens
            <select
              value={search.emailFrequency}
              onChange={(e) =>
                patch({ emailFrequency: e.target.value as "daglig" | "umiddelbart" })
              }
              className="cursor-pointer rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <option value="daglig">Daglig oppsummering</option>
              <option value="umiddelbart">Umiddelbart</option>
            </select>
          </label>
        )}
        <ChannelToggle
          label="I appen"
          checked={search.inAppEnabled}
          onChange={(v) => patch({ inAppEnabled: v })}
        />
        <ChannelToggle
          label="Push"
          checked={search.pushEnabled}
          onChange={(v) => patch({ pushEnabled: v })}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-accent-ink">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteSavedSearch(search.id);
            if (!res.ok) setError(res.error);
            setConfirmDelete(false);
          })
        }
        title="Slette lagret søk?"
        message={`«${search.name}» slettes og du får ikke flere varsler for det.`}
        danger
      />
    </li>
  );
}

function ChannelToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[32px] cursor-pointer items-center gap-2 text-[12.5px] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative h-[18px] w-[32px] rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface ${
          checked ? "bg-ink" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-surface transition-transform ${
            checked ? "translate-x-[16px]" : "translate-x-[2px]"
          }`}
        />
      </span>
      {label}
    </label>
  );
}
