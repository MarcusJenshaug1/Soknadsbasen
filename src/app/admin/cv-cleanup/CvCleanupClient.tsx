"use client";

import { useCallback, useEffect, useState } from "react";

type CorruptRow = {
  userId: string;
  userEmail: string;
  userName: string | null;
  cvEmail: string | null;
  cvFirstName: string | null;
  cvLastName: string | null;
  updatedAt: string;
};

type ListResponse = { count: number; rows: CorruptRow[] };
type CleanupResponse = { count: number; reset: number; affected: CorruptRow[] };

type InspectPayload = {
  user: { id: string; email: string; name: string | null };
  resumeData: unknown;
  coverLetterData: unknown;
  updatedAt: string | null;
};

export function CvCleanupClient() {
  const [rows, setRows] = useState<CorruptRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<CleanupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspect, setInspect] = useState<InspectPayload | null>(null);
  const [inspectLoading, setInspectLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filter.trim()
        ? `/api/admin/cv-cleanup?cvEmail=${encodeURIComponent(filter.trim())}`
        : "/api/admin/cv-cleanup";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ListResponse;
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  async function openInspect(userId: string) {
    setInspectLoading(userId);
    try {
      const res = await fetch(`/api/admin/cv-cleanup/${userId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as InspectPayload;
      setInspect(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke hente CV");
    } finally {
      setInspectLoading(null);
    }
  }

  async function resetOne(userId: string, userEmail: string) {
    if (!confirm(`Resette resumeData på ${userEmail}? Kan ikke angres.`)) return;
    await runReset([userId]);
  }

  async function resetAllVisible() {
    if (!rows || rows.length === 0) return;
    const userEmails = rows.map((r) => r.userEmail).join(", ");
    if (
      !confirm(
        `Resette resumeData på ${rows.length} rader (${userEmails})? Kan ikke angres.`,
      )
    )
      return;
    await runReset(rows.map((r) => r.userId));
  }

  async function runReset(userIds: string[]) {
    setRunning(userIds.join(","));
    setError(null);
    try {
      const res = await fetch("/api/admin/cv-cleanup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as CleanupResponse;
      setResult(data);
      await fetchRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setRunning(null);
    }
  }

  if (loading && rows === null) {
    return <p className="text-[13px] text-ink/55">Skanner UserData …</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 leading-[1.5]">
        <strong>Advarsel:</strong> Mange brukere har legitim email-mismatch
        (jobb-login vs personlig CV-kontakt). Reset bare rader hvor du har
        verifisert at CV-innholdet IKKE tilhører den faktiske bruker-id-en
        (typisk: contact-info matcher en annen bruker / admin). Bruk{" "}
        <strong>Vis CV</strong>-knappen først.
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-3">
          <div className="text-[13px] text-emerald-800 font-medium">
            Resettet resumeData på {result.reset} av {result.count} rader.
          </div>
          {result.affected.length > 0 && (
            <details className="text-[12px] text-emerald-900" open>
              <summary className="cursor-pointer hover:underline">
                Vis hvilke brukere som ble ryddet ({result.affected.length})
              </summary>
              <ul className="mt-2 space-y-1.5 pl-4">
                {result.affected.map((r) => (
                  <li key={r.userId} className="leading-[1.5]">
                    <span className="font-medium">{r.userEmail}</span>
                    <span className="text-emerald-700/70"> ← hadde CV fra </span>
                    <span className="font-medium">{r.cvEmail}</span>
                    <span className="text-emerald-700/60">
                      {" "}
                      ({r.cvFirstName} {r.cvLastName})
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Feil: {error}
        </div>
      )}

      <div className="rounded-2xl border border-black/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink/40">
                Email-mismatch-rader
              </div>
              <div className="text-[20px] font-semibold mt-0.5">
                {rows?.length ?? 0}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchRows}
                disabled={loading}
                className="px-4 py-2 rounded-full border border-black/15 text-[12px] hover:bg-black/5 disabled:opacity-40"
              >
                {loading ? "Skanner …" : "Skann på nytt"}
              </button>
              <button
                type="button"
                onClick={resetAllVisible}
                disabled={!!running || !rows || rows.length === 0}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-[12px] font-medium hover:bg-red-700 disabled:opacity-40"
              >
                {running ? "Resetter …" : "Reset alle synlige"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase tracking-wide text-ink/40">
              Filtrer på CV-email
            </label>
            <input
              type="email"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="marcus@jenshaug.no"
              className="flex-1 max-w-[280px] border-b border-black/20 bg-transparent py-1 text-[13px] outline-none focus:border-ink"
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                className="text-[11px] text-ink/45 hover:text-ink"
              >
                Tøm
              </button>
            )}
          </div>
        </div>

        {rows && rows.length > 0 ? (
          <div className="divide-y divide-black/6">
            {rows.map((r) => (
              <div
                key={r.userId}
                className="px-5 py-3 grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-baseline"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {r.userName ?? r.userEmail}
                  </div>
                  <div className="text-[11px] text-ink/45 truncate">{r.userEmail}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-0.5">
                    Lagret CV-eier
                  </div>
                  <div className="text-[12px] text-ink/75 truncate">
                    {r.cvFirstName} {r.cvLastName}
                  </div>
                  <div className="text-[11px] text-red-600 truncate">{r.cvEmail}</div>
                </div>
                <div className="text-[11px] text-ink/40 tabular-nums shrink-0">
                  {new Date(r.updatedAt).toLocaleDateString("nb-NO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => openInspect(r.userId)}
                  disabled={inspectLoading === r.userId}
                  className="px-3 py-1.5 rounded-full border border-black/15 text-[11px] hover:bg-black/5 disabled:opacity-40 shrink-0"
                >
                  {inspectLoading === r.userId ? "Henter…" : "Vis CV"}
                </button>
                <button
                  type="button"
                  onClick={() => resetOne(r.userId, r.userEmail)}
                  disabled={running !== null}
                  className="px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-[11px] hover:bg-red-50 disabled:opacity-40 shrink-0"
                >
                  {running === r.userId ? "…" : "Reset denne"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[13px] text-ink/45">
            {filter ? `Ingen rader med CV-email = ${filter}` : "Ingen email-mismatch-rader."}
          </div>
        )}
      </div>

      {inspect && (
        <InspectModal data={inspect} onClose={() => setInspect(null)} />
      )}

      <p className="text-[11px] text-ink/45 leading-[1.5] max-w-2xl">
        Reset setter <code>resumeData</code> til <code>{`'{}'`}</code>.{" "}
        <code>coverLetterData</code> beholdes. Admins egen rad blokkeres
        serverside selv om den havner i lista. Tips: filtrér på en spesifikk
        cv-email (f.eks. admin sin) for å finne nøyaktig de radene som ble
        korrumpert av impersonation-bugen.
      </p>
    </div>
  );
}

function InspectModal({
  data,
  onClose,
}: {
  data: InspectPayload;
  onClose: () => void;
}) {
  const json = JSON.stringify(data.resumeData, null, 2);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // ignore
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Full CV-data"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[900px] max-h-[88vh] overflow-hidden rounded-2xl bg-bg shadow-2xl border border-black/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-black/8 px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink/45 mb-1">
              UserData-rad
            </div>
            <h2 className="text-[16px] font-medium tracking-tight text-ink truncate">
              {data.user.email}
            </h2>
            <p className="text-[11px] text-ink/55 mt-0.5">
              Eier-userId: <code>{data.user.id}</code>
              {data.updatedAt && (
                <>
                  {" · Sist oppdatert "}
                  {new Date(data.updatedAt).toLocaleString("nb-NO")}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-3 py-1.5 rounded-full border border-black/15 text-[11px] hover:bg-black/5"
            >
              Kopier JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Lukk"
              className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-ink/60 hover:text-ink transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {data.resumeData == null ? (
            <p className="text-[13px] text-ink/55 italic">
              Ingen resumeData lagret (raden er allerede ryddet eller har aldri hatt CV).
            </p>
          ) : (
            <pre className="text-[11px] leading-[1.5] font-mono whitespace-pre-wrap break-words bg-panel/50 rounded-xl p-4">
              {json}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
