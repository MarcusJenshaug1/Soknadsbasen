"use client";

import { useEffect, useState } from "react";

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
type CleanupResponse = { count: number; reset: number; affectedUserIds: string[] };

export function CvCleanupClient() {
  const [rows, setRows] = useState<CorruptRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CleanupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRows() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cv-cleanup", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ListResponse;
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, []);

  async function runCleanup() {
    if (!rows || rows.length === 0) return;
    const confirmText = `Resette resumeData på ${rows.length} korrupte rader? Kan ikke angres.`;
    if (!confirm(confirmText)) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cv-cleanup", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as CleanupResponse;
      setResult(data);
      // Refresh listen
      await fetchRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setRunning(false);
    }
  }

  if (loading && rows === null) {
    return <p className="text-[13px] text-ink/55">Skanner UserData …</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        Feil: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
          Resettet resumeData på {result.reset} av {result.count} rader.
        </div>
      )}

      <div className="rounded-2xl border border-black/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink/40">
              Korrupte rader
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
              onClick={runCleanup}
              disabled={running || !rows || rows.length === 0}
              className="px-4 py-2 rounded-full bg-red-600 text-white text-[12px] font-medium hover:bg-red-700 disabled:opacity-40"
            >
              {running ? "Resetter …" : "Reset alle"}
            </button>
          </div>
        </div>

        {rows && rows.length > 0 ? (
          <div className="divide-y divide-black/6">
            {rows.map((r) => (
              <div key={r.userId} className="px-5 py-3 grid grid-cols-[1fr_1fr_auto] gap-4 items-baseline">
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
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-[13px] text-ink/45">
            Ingen korrupte rader. ✓
          </div>
        )}
      </div>

      <p className="text-[11px] text-ink/45 leading-[1.5] max-w-2xl">
        Reset setter <code>resumeData</code> til <code>{`'{}'`}</code>. <code>coverLetterData</code>{" "}
        beholdes (har ikke samme korrupsjons-vektor). Target-brukere må bygge CV fra null
        ved neste login.
      </p>
    </div>
  );
}
