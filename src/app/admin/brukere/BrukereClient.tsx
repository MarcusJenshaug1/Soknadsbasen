"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  LogIn,
  Shield,
  Zap,
  CreditCard,
  Search,
  UserPlus,
} from "lucide-react";
import { suspendCloudSync } from "@/hooks/useCloudSync";
import { cn } from "@/lib/cn";

type Subscription = { status: string; type: string; currentPeriodEnd: string | Date };

type User = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  aiUnlimited: boolean;
  createdAt: string | Date;
  subscription: Subscription | null;
  orgMemberships: { role: string; org: { slug: string; displayName: string } }[];
};

export type AdminStats = {
  total: number;
  betalende: number;
  prove: number;
  admins: number;
  evigAi: number;
  orgMedlemmer: number;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  canceled: "bg-red-100 text-red-600",
  past_due: "bg-orange-100 text-orange-700",
  expired: "bg-zinc-100 text-zinc-600",
  manual: "bg-purple-100 text-purple-700",
};

type AccessKey =
  | "admin"
  | "betalende"
  | "prove"
  | "org"
  | "kansellert"
  | "utlopt"
  | "ingen";

/** Effektiv tilgangsstatus til pille + filter — ett øyekast per bruker. */
function accessState(
  u: User,
  isSuperAdmin: boolean,
): { key: AccessKey; label: string; cls: string } {
  if (isSuperAdmin || u.isAdmin)
    return { key: "admin", label: "Gratis (admin)", cls: "bg-amber-100 text-amber-700" };

  const sub = u.subscription;
  if (u.orgMemberships[0] && !sub)
    return { key: "org", label: "Org-tilgang", cls: "bg-indigo-100 text-indigo-700" };
  if (!sub) return { key: "ingen", label: "Ingen", cls: "bg-zinc-100 text-zinc-500" };

  const expired = new Date(sub.currentPeriodEnd).getTime() < Date.now();
  if (expired) return { key: "utlopt", label: "Utløpt", cls: "bg-zinc-100 text-zinc-600" };
  if (sub.status === "active")
    return { key: "betalende", label: "Betalende", cls: "bg-green-100 text-green-700" };
  if (sub.status === "trialing")
    return { key: "prove", label: "Prøveperiode", cls: "bg-blue-100 text-blue-700" };
  if (sub.status === "canceled")
    return { key: "kansellert", label: "Kansellert", cls: "bg-red-100 text-red-600" };
  if (sub.status === "past_due")
    return { key: "kansellert", label: "Betaling mislyktes", cls: "bg-orange-100 text-orange-700" };
  return { key: "ingen", label: sub.status, cls: "bg-zinc-100 text-zinc-600" };
}

type FilterKey = "alle" | "betalende" | "prove" | "gratis" | "utlopt";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "betalende", label: "Betalende" },
  { key: "prove", label: "Prøveperiode" },
  { key: "gratis", label: "Gratis-tilgang" },
  { key: "utlopt", label: "Utløpt / ingen" },
];

function matchesFilter(state: AccessKey, filter: FilterKey): boolean {
  switch (filter) {
    case "alle":
      return true;
    case "betalende":
      return state === "betalende";
    case "prove":
      return state === "prove";
    case "gratis":
      return state === "admin" || state === "org";
    case "utlopt":
      return state === "utlopt" || state === "ingen" || state === "kansellert";
  }
}

type Discount = {
  couponId: string;
  name: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
} | null;

function SubPanel({
  user,
  onUpdate,
  openSignal = 0,
}: {
  user: User;
  onUpdate: (sub: Subscription | null) => void;
  /** Bump fra kebab-menyen for å åpne panelet utenfra. */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);
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

export function BrukereClient({
  initialUsers,
  adminEmail,
  stats,
}: {
  initialUsers: User[];
  adminEmail: string;
  stats: AdminStats;
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("alle");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [subSignal, setSubSignal] = useState<Record<string, number>>({});

  async function impersonate(user: User) {
    setImpersonatingId(user.id);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Klarte ikke starte impersonering: ${data.error ?? res.status}`);
        setImpersonatingId(null);
        return;
      }
      // Stopp alle pending/beforeunload saves: cookien er nå satt, så et
      // siste save fra denne fanen ville skrevet admins in-memory CV inn
      // i target's UserData-rad. Må kjøres FØR hard-nav.
      suspendCloudSync();
      window.location.href = "/app";
    } catch {
      alert("Klarte ikke starte impersonering");
      setImpersonatingId(null);
    }
  }

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

  async function toggleAiUnlimited(user: User) {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/toggle-ai-unlimited`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, aiUnlimited: data.aiUnlimited } : u,
          ),
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  function updateSub(userId: string, sub: Subscription | null) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, subscription: sub } : u)));
  }

  const visible = users.filter((u) =>
    matchesFilter(accessState(u, u.email === adminEmail).key, filter),
  );

  return (
    <div className="space-y-6">
      {/* Statistikk — globale tall */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard label="Totalt" value={stats.total} />
        <StatCard label="Betalende" value={stats.betalende} tone="green" />
        <StatCard label="Prøveperiode" value={stats.prove} tone="blue" />
        <StatCard label="Org-medlemmer" value={stats.orgMedlemmer} tone="indigo" />
        <StatCard label="Admins" value={stats.admins} tone="amber" />
        <StatCard label="Evig AI" value={stats.evigAi} tone="purple" />
      </div>

      {/* Verktøylinje: søk + inviter */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={search} className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk på e-post…"
            className="w-full rounded-full border border-black/12 bg-bg pl-9 pr-24 py-2 text-[13.5px] outline-none focus:border-ink/40"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-ink text-bg text-[12px] font-medium disabled:opacity-40"
          >
            {loading ? "Søker…" : "Søk"}
          </button>
        </form>
        <button
          onClick={() => setInviteOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-black/12 text-[13px] font-medium hover:border-black/30 transition-colors shrink-0"
        >
          <UserPlus size={14} />
          Inviter bruker
        </button>
      </div>

      {/* Inviter (sammenleggbar) */}
      {inviteOpen && (
        <div className="rounded-2xl border border-black/10 bg-black/[0.015] p-5">
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
      )}

      {/* Filter-chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-ink/40 mr-1">Filtrer listen</span>
        {FILTERS.map((f) => {
          const count = users.filter((u) =>
            matchesFilter(accessState(u, u.email === adminEmail).key, f.key),
          ).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1 rounded-full text-[12px] font-medium transition-colors border",
                filter === f.key
                  ? "border-ink bg-ink text-bg"
                  : "border-black/12 text-ink/60 hover:border-black/30",
              )}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Brukerliste */}
      <div className="border border-black/8 rounded-xl overflow-hidden divide-y divide-black/6">
        {visible.map((u) => {
          const isSuperAdmin = u.email === adminEmail;
          const sub = u.subscription;
          const initials = (u.name ?? u.email).slice(0, 2).toUpperCase();
          const state = accessState(u, isSuperAdmin);
          const busy = togglingId === u.id;

          return (
            <div key={u.id} className="px-4 py-3 bg-bg hover:bg-black/[0.015] transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
                  isSuperAdmin ? "bg-red-100 text-red-700" :
                  u.isAdmin ? "bg-amber-100 text-amber-700" :
                  "bg-black/8 text-ink/60",
                )}>
                  {initials}
                </div>

                {/* Navn + e-post + chips */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13.5px] font-medium truncate">{u.name ?? u.email}</span>
                    {isSuperAdmin && <Chip cls="bg-red-100 text-red-700">superadmin</Chip>}
                    {u.aiUnlimited && !u.isAdmin && !isSuperAdmin && (
                      <Chip cls="bg-purple-100 text-purple-700">evig AI</Chip>
                    )}
                    {u.orgMemberships[0] && (
                      <a
                        href={`/admin/orger/${u.orgMemberships[0].org.slug}`}
                        className="text-[10.5px] px-1.5 py-px rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0 truncate max-w-[140px]"
                      >
                        {u.orgMemberships[0].org.displayName}
                      </a>
                    )}
                  </div>
                  <div className="text-[12px] text-ink/40 truncate mt-0.5">{u.email}</div>
                </div>

                {/* Status-kolonne — alltid samme plass */}
                <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 w-[120px]">
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", state.cls)}>
                    {state.label}
                  </span>
                  {sub && (
                    <span className="text-[10.5px] text-ink/40">
                      {sub.type === "one_time" ? "Engangs" : sub.type === "monthly" ? "Månedlig" : sub.type}
                      {" · "}
                      {new Date(sub.currentPeriodEnd).toLocaleDateString("nb-NO")}
                    </span>
                  )}
                </div>

                {/* Opprettet */}
                <span className="hidden lg:block text-[11.5px] text-ink/30 tabular-nums shrink-0 w-[78px] text-right">
                  {new Date(u.createdAt).toLocaleDateString("nb-NO")}
                </span>

                {/* Kebab-meny */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                    disabled={busy || impersonatingId === u.id}
                    className="size-8 rounded-lg flex items-center justify-center text-ink/45 hover:text-ink hover:bg-black/5 transition-colors disabled:opacity-40"
                    aria-label="Handlinger"
                  >
                    {busy || impersonatingId === u.id ? (
                      <span className="size-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-ink/60" />
                    ) : (
                      <MoreHorizontal size={16} />
                    )}
                  </button>
                  {menuId === u.id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuId(null)} />
                      <div className="absolute right-0 top-9 z-30 w-52 rounded-xl border border-black/10 bg-bg shadow-lg overflow-hidden py-1 text-[13px]">
                        <MenuItem
                          icon={<LogIn size={14} />}
                          onClick={() => { setMenuId(null); impersonate(u); }}
                          danger
                        >
                          Logg inn som
                        </MenuItem>
                        {!isSuperAdmin && (
                          <MenuItem
                            icon={<Shield size={14} />}
                            onClick={() => { setMenuId(null); toggleAdmin(u); }}
                          >
                            {u.isAdmin ? "Fjern admin" : "Gi admin"}
                          </MenuItem>
                        )}
                        {!isSuperAdmin && !u.isAdmin && (
                          <MenuItem
                            icon={<Zap size={14} />}
                            onClick={() => { setMenuId(null); toggleAiUnlimited(u); }}
                          >
                            {u.aiUnlimited ? "Fjern evig AI" : "Gi evig AI"}
                          </MenuItem>
                        )}
                        {!isSuperAdmin && !u.isAdmin && (
                          <MenuItem
                            icon={<CreditCard size={14} />}
                            onClick={() => {
                              setMenuId(null);
                              setSubSignal((s) => ({ ...s, [u.id]: (s[u.id] ?? 0) + 1 }));
                            }}
                          >
                            Administrer abonnement
                          </MenuItem>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!u.isAdmin && !isSuperAdmin && (
                <div className="ml-12">
                  <SubPanel
                    user={u}
                    onUpdate={(s) => updateSub(u.id, s)}
                    openSignal={subSignal[u.id] ?? 0}
                  />
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-ink/50">
            {searched || filter !== "alle" ? "Ingen treff." : "Ingen brukere."}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number;
  tone?: "ink" | "green" | "blue" | "indigo" | "amber" | "purple";
}) {
  const toneCls: Record<string, string> = {
    ink: "text-ink",
    green: "text-green-700",
    blue: "text-blue-700",
    indigo: "text-indigo-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
  };
  return (
    <div className="rounded-xl border border-black/8 bg-bg px-3.5 py-3">
      <div className={cn("text-[22px] font-semibold tabular-nums leading-none", toneCls[tone])}>
        {value}
      </div>
      <div className="text-[11px] text-ink/50 mt-1.5">{label}</div>
    </div>
  );
}

function Chip({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={cn("text-[10px] px-1.5 py-px rounded-full font-medium shrink-0", cls)}>
      {children}
    </span>
  );
}

function MenuItem({
  icon,
  onClick,
  danger = false,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-black/5 transition-colors",
        danger ? "text-red-600" : "text-ink/80",
      )}
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </button>
  );
}
