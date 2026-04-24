"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Subscription = { status: string; type: string; currentPeriodEnd: string | Date };

type User = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string | Date;
  subscription: Subscription | null;
  orgMemberships: { role: string; org: { slug: string; displayName: string } }[];
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  canceled: "bg-red-100 text-red-600",
  past_due: "bg-orange-100 text-orange-700",
  expired: "bg-zinc-100 text-zinc-600",
  manual: "bg-purple-100 text-purple-700",
};

type Discount = {
  couponId: string;
  name: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
} | null;

function SubPanel({ user, onUpdate }: { user: User; onUpdate: (sub: Subscription | null) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [discount, setDiscount] = useState<Discount>(null);
  const [discountReason, setDiscountReason] = useState<string | null>(null);
  const [discountFetched, setDiscountFetched] = useState(false);
  const [loadingDiscount, setLoadingDiscount] = useState(false);

  const sub = user.subscription;

  const [editType, setEditType] = useState(sub?.type ?? "monthly");
  const [editStatus, setEditStatus] = useState(sub?.status ?? "active");
  const [extendDays, setExtendDays] = useState("30");
  const [grantMonths, setGrantMonths] = useState("12");
  const [grantType, setGrantType] = useState("manual");

  useEffect(() => {
    if (!open || discountFetched) return;
    setLoadingDiscount(true);
    fetch(`/api/admin/users/${user.id}/subscription`)
      .then((r) => r.json())
      .then((d) => { setDiscount(d.discount ?? null); setDiscountReason(d.reason ?? null); setDiscountFetched(true); })
      .catch(() => { setDiscount(null); setDiscountFetched(true); })
      .finally(() => setLoadingDiscount(false));
  }, [open, discountFetched, user.id]);

  async function call(action: string, extra: Record<string, unknown> = {}, label = action) {
    setSaving(label);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Noe gikk galt"); return; }
      onUpdate(data.subscription);
      if (data.subscription) {
        setEditType(data.subscription.type);
        setEditStatus(data.subscription.status);
      }
    } catch {
      setErr("Noe gikk galt");
    } finally {
      setSaving(null);
    }
  }

  const endDate = sub ? new Date(sub.currentPeriodEnd).toLocaleDateString("nb-NO") : null;
  const sel = "border border-black/15 rounded-lg px-2 py-1.5 text-[13px] bg-bg outline-none focus:border-ink";
  const inp = "w-16 text-center border-b border-black/20 bg-transparent py-1.5 text-[13px] outline-none focus:border-ink";
  const btn = (color: string) => `px-4 py-1.5 rounded-full text-[12px] font-medium disabled:opacity-40 transition-opacity ${color}`;

  return (
    <div className="mt-3 border-t border-black/6 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[12px] text-ink/40 hover:text-ink transition-colors mt-1"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? "Skjul" : "Administrer abonnement"}
      </button>

      {open && (
        <div className="mt-4 space-y-5 text-[13px]">

          {/* Status card */}
          <div className="rounded-xl bg-black/3 px-4 py-3 space-y-2">
            {sub ? (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[sub.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {sub.type}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {sub.status}
                  </span>
                  <span className="text-[12px] text-ink/50">utløper {endDate}</span>
                </div>
                <div className="text-[12px]">
                  {loadingDiscount && <span className="text-ink/40">Henter rabatt…</span>}
                  {!loadingDiscount && discount && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                      <span>🏷</span>
                      <span>{discount.name}</span>
                      {discount.percentOff != null && <span className="text-emerald-600">{discount.percentOff}% av</span>}
                      {discount.amountOff != null && <span className="text-emerald-600">{discount.amountOff} {(discount.currency ?? "").toUpperCase()} av</span>}
                    </span>
                  )}
                  {!loadingDiscount && discountFetched && !discount && (
                    <span className="text-ink/30">
                      {discountReason === "no_stripe_link"
                        ? "Ikke koblet til Stripe-abonnement"
                        : "Ingen aktiv rabatt"}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-ink/40 italic text-[13px]">Ingen abonnement registrert</p>
            )}
          </div>

          {/* Type + Status — one row, one save */}
          {sub && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/40 font-medium mb-2">Endre type / status</p>
              <div className="flex gap-2 flex-wrap items-center">
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className={sel}>
                  <option value="monthly">monthly</option>
                  <option value="one_time">one_time</option>
                  <option value="manual">manual</option>
                </select>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={sel}>
                  {["active", "trialing", "canceled", "past_due", "expired"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    if (editType !== sub.type) await call("set_type", { type: editType }, "type");
                    if (editStatus !== sub.status) await call("set_status", { status: editStatus }, "status");
                  }}
                  disabled={saving !== null}
                  className={btn("bg-ink text-bg")}
                >
                  {saving === "type" || saving === "status" ? "Lagrer…" : "Lagre"}
                </button>
              </div>
            </div>
          )}

          {/* Extend */}
          {sub && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/40 font-medium mb-2">Forleng tilgang</p>
              <div className="flex gap-2 items-center">
                <input type="number" min="1" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className={inp} />
                <span className="text-ink/50">dager</span>
                <button
                  onClick={() => call("extend", { days: Number(extendDays) }, "extend")}
                  disabled={saving !== null}
                  className={btn("bg-ink text-bg")}
                >
                  {saving === "extend" ? "…" : "Forleng"}
                </button>
              </div>
            </div>
          )}

          {/* Grant / reset */}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/40 font-medium mb-2">
              {sub ? "Nullstill abonnement" : "Gi tilgang manuelt"}
            </p>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={grantType} onChange={(e) => setGrantType(e.target.value)} className={sel}>
                <option value="manual">Manuell</option>
                <option value="monthly">Monthly</option>
                <option value="one_time">One-time</option>
              </select>
              <input type="number" min="1" max="120" value={grantMonths} onChange={(e) => setGrantMonths(e.target.value)} className={inp} />
              <span className="text-ink/50">mnd</span>
              <button
                onClick={() => call("grant", { months: Number(grantMonths), type: grantType }, "grant")}
                disabled={saving !== null}
                className={btn("bg-green-600 text-white")}
              >
                {saving === "grant" ? "…" : sub ? "Nullstill" : "Gi tilgang"}
              </button>
            </div>
          </div>

          {/* Cancel */}
          {sub && sub.status !== "canceled" && (
            <button
              onClick={() => call("cancel", {}, "cancel")}
              disabled={saving !== null}
              className="text-[12px] text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
            >
              {saving === "cancel" ? "Kansellerer…" : "Kanseller abonnement"}
            </button>
          )}

          {err && <p className="text-[12px] text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}

export function BrukereClient({ initialUsers, adminEmail }: { initialUsers: User[]; adminEmail: string }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMsg({ ok: false, text: data.error ?? "Noe gikk galt" });
      } else {
        setInviteMsg({ ok: true, text: `Invitasjon sendt til ${inviteEmail}` });
        setInviteEmail("");
        setInviteName("");
      }
    } catch {
      setInviteMsg({ ok: false, text: "Noe gikk galt" });
    } finally {
      setInviting(false);
    }
  }

  async function toggleAdmin(user: User) {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/toggle-admin`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isAdmin: data.isAdmin } : u)),
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  function updateSub(userId: string, sub: Subscription | null) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, subscription: sub } : u)));
  }

  return (
    <div className="space-y-8">
      {/* Invite form */}
      <div className="rounded-2xl border border-black/10 p-5">
        <h2 className="text-[14px] font-semibold mb-4">Inviter bruker</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">E-post</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="bruker@epost.no"
              className="w-full border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Navn (valgfritt)</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Ola Nordmann"
              className="w-full border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink/50 mb-1">Rolle</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "user" | "admin")}
              className="border border-black/15 rounded-lg px-3 py-2 text-[13px] bg-bg outline-none focus:border-ink"
            >
              <option value="user">Vanlig bruker</option>
              <option value="admin">Admin (gratis tilgang)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-5 py-2 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40 shrink-0"
          >
            {inviting ? "Sender…" : "Send invitasjon"}
          </button>
        </form>
        {inviteMsg && (
          <p className={`mt-3 text-[13px] ${inviteMsg.ok ? "text-green-600" : "text-red-600"}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Search */}
      <form onSubmit={search} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk på epost…"
          className="flex-1 border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40"
        >
          {loading ? "Søker…" : "Søk"}
        </button>
      </form>

      {/* User list */}
      {(searched || users.length > 0) && (
        <div className="border border-black/8 rounded-xl overflow-hidden divide-y divide-black/6">
          {users.map((u) => {
            const isSuperAdmin = u.email === adminEmail;
            const sub = u.subscription;
            const initials = (u.name ?? u.email).slice(0, 2).toUpperCase();

            return (
            <div key={u.id} className="px-4 py-3 bg-bg hover:bg-black/[0.015] transition-colors">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                  isSuperAdmin ? "bg-red-100 text-red-700" :
                  u.isAdmin    ? "bg-amber-100 text-amber-700" :
                                 "bg-black/8 text-ink/60"
                }`}>
                  {initials}
                </div>

                {/* Name + email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[13px] font-medium truncate">{u.name ?? u.email}</span>
                    {isSuperAdmin && <span className="text-[10px] text-red-600 font-medium shrink-0">superadmin</span>}
                    {!isSuperAdmin && u.isAdmin && <span className="text-[10px] text-amber-600 font-medium shrink-0">admin</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[12px] text-ink/40">{u.email}</span>
                    {sub && !u.isAdmin && !isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink/40">
                        <span className="text-ink/25">Abo:</span>
                        <span className={`px-1.5 py-px rounded font-medium ${STATUS_COLORS[sub.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                          {sub.type === "one_time" ? "Engangs" : sub.type === "monthly" ? "Månedlig" : sub.type}
                        </span>
                        <span className={`px-1.5 py-px rounded ${STATUS_COLORS[sub.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                          {sub.status}
                        </span>
                      </span>
                    )}
                    {(u.isAdmin || isSuperAdmin) && (
                      <span className="text-[11px] text-amber-600">gratis tilgang</span>
                    )}
                    {u.orgMemberships[0] && (
                      <a href={`/admin/orger/${u.orgMemberships[0].org.slug}`} className="text-[11px] text-ink/40 hover:text-ink">
                        {u.orgMemberships[0].org.displayName}
                      </a>
                    )}
                  </div>
                </div>

                {/* Right: date + action */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[12px] text-ink/30 tabular-nums">
                    {new Date(u.createdAt).toLocaleDateString("nb-NO")}
                  </span>
                  {!isSuperAdmin && (
                    <button
                      onClick={() => toggleAdmin(u)}
                      disabled={togglingId === u.id}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                        u.isAdmin
                          ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                          : "border-black/10 text-ink/40 hover:text-ink hover:border-black/20"
                      }`}
                    >
                      {togglingId === u.id ? "…" : u.isAdmin ? "Fjern admin" : "Gi admin"}
                    </button>
                  )}
                </div>
              </div>

              {!u.isAdmin && !isSuperAdmin && (
                <div className="ml-11">
                  <SubPanel user={u} onUpdate={(s) => updateSub(u.id, s)} />
                </div>
              )}
            </div>
            );
          })}
          {users.length === 0 && searched && (
            <p className="text-[13px] text-ink/50">Ingen treff.</p>
          )}
        </div>
      )}
    </div>
  );
}
