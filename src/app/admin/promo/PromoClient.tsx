"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type PromoCode = {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  expires_at: number | null;
  coupon: {
    percent_off: number | null;
    amount_off: number | null;
    duration: string;
    duration_in_months: number | null;
  };
};

export function PromoClient() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo");
      const data = await res.json();
      setCodes(data.codes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  async function deactivate(id: string) {
    await fetch(`/api/admin/promo/${id}`, { method: "DELETE" });
    setCodes((prev) => prev.map((c) => c.id === id ? { ...c, active: false } : c));
  }

  function formatDiscount(c: PromoCode["coupon"]) {
    if (c.percent_off) return `${c.percent_off}%`;
    if (c.amount_off) return `${(c.amount_off / 100).toFixed(0)} kr`;
    return "—";
  }

  function formatDuration(c: PromoCode["coupon"]) {
    if (c.duration === "once") return "Én gang";
    if (c.duration === "forever") return "For alltid";
    if (c.duration === "repeating") return `${c.duration_in_months} md`;
    return c.duration;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/admin/promo/ny"
          className="px-5 py-2 rounded-full bg-ink text-bg text-[13px] font-medium"
        >
          + Ny kode
        </Link>
      </div>

      {loading ? (
        <p className="text-[13px] text-ink/50">Henter koder…</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-black/8 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-mono font-medium">{c.code}</span>
                  {!c.active && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inaktiv</span>
                  )}
                </div>
                <div className="text-[12px] text-ink/50 mt-0.5">
                  {formatDiscount(c.coupon)} · {formatDuration(c.coupon)}
                  {c.expires_at && ` · utløper ${new Date(c.expires_at * 1000).toLocaleDateString("nb-NO")}`}
                </div>
              </div>
              <div className="text-[12px] text-ink/50 shrink-0">
                {c.times_redeemed}{c.max_redemptions ? `/${c.max_redemptions}` : ""} brukt
              </div>
              {c.active && (
                <button
                  onClick={() => deactivate(c.id)}
                  className="text-[12px] text-ink/40 hover:text-red-600 transition-colors"
                >
                  Deaktiver
                </button>
              )}
            </div>
          ))}
          {codes.length === 0 && <p className="text-[13px] text-ink/50">Ingen koder ennå.</p>}
        </div>
      )}
    </div>
  );
}
