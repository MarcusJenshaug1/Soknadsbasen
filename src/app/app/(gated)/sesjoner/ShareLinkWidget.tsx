"use client";

import { useEffect, useState } from "react";

type LinkData = {
  token: string;
  expiresAt: string;
  createdAt: string;
  label: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function ShareLinkWidget() {
  const [link, setLink] = useState<LinkData | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/share")
      .then((r) => r.json())
      .then((d) => setLink(d.link ?? null))
      .catch(() => setLink(null));
  }, []);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await res.json() as { link: LinkData };
      setLink(d.link);
    } finally {
      setLoading(false);
    }
  }

  async function revoke() {
    setLoading(true);
    try {
      await fetch("/api/share", { method: "DELETE" });
      setLink(null);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    const url = `${window.location.origin}/delt/${link.token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link === undefined) return null;

  return (
    <div className="border border-black/8 dark:border-white/8 rounded-2xl px-5 py-5 bg-surface mt-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-[15px] font-medium">Del med coach / mentor</h2>
          <p className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mt-0.5">
            Generer en read-only lenke til din pipeline. Ingen innlogging kreves.
          </p>
        </div>
        {link ? (
          <button
            onClick={revoke}
            disabled={loading}
            className="shrink-0 text-[11px] text-[#14110e]/40 dark:text-[#f0ece6]/40 hover:text-accent transition-colors"
          >
            Deaktiver
          </button>
        ) : null}
      </div>

      {link ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/delt/${link.token}`}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 text-[12px] bg-bg text-[#14110e]/70 dark:text-[#f0ece6]/70 truncate"
            />
            <button
              onClick={copy}
              className="shrink-0 px-4 py-2 rounded-xl bg-ink text-bg text-[12px] font-medium hover:opacity-80 transition-opacity"
            >
              {copied ? "Kopiert!" : "Kopier"}
            </button>
          </div>
          <p className="text-[11px] text-[#14110e]/40 dark:text-[#f0ece6]/40">
            Utløper {formatDate(link.expiresAt)} · Lenken gir kun lesetilgang.
          </p>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="px-5 py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {loading ? "Genererer …" : "Generer del-lenke"}
        </button>
      )}
    </div>
  );
}
