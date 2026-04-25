"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Search, UserPlus, X } from "lucide-react";

type Member = {
  id: string;
  role: string;
  status: string;
  sharesDataWithOrg: boolean;
  createdAt: string | Date;
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
};

type StatusFilter = "all" | "active" | "invited" | "suspended";
type RoleFilter = "all" | "admin" | "member";
type SortKey = "recent" | "name" | "email";

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  invited: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-600",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  invited: "Invitert",
  suspended: "Suspendert",
};

function initialsFor(name?: string | null, email?: string | null) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  return src
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MedlemmerClient({
  slug,
  callerRole,
  seatLimit,
  initialMembers,
  initialCursor,
  totalActive,
  totalInvited,
}: {
  slug: string;
  callerRole: string;
  seatLimit: number;
  initialMembers: Member[];
  initialCursor: string | null;
  totalActive: number;
  totalInvited: number;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [cursor, setCursor] = useState(initialCursor);
  const [active, setActive] = useState(totalActive);
  const [invited, setInvited] = useState(totalInvited);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const [loading, startLoad] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [poolFullDialog, setPoolFullDialog] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    name: string;
    email: string;
    status: string;
  } | null>(null);

  const isAdmin = callerRole === "admin";
  const seatsUsed = active + invited;
  const poolFull = seatsUsed >= seatLimit;
  const usagePct = Math.min(100, (seatsUsed / seatLimit) * 100);

  function flash(ok: boolean, text: string) {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3500);
  }

  // Debounced søk/filter
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage({ reset: true });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, roleFilter, sort]);

  async function fetchPage({ reset }: { reset: boolean }) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (roleFilter !== "all") params.set("role", roleFilter);
    params.set("sort", sort);
    if (!reset && cursor) params.set("cursor", cursor);
    params.set("take", "50");

    const call = async () => {
      const res = await fetch(`/api/org/${slug}/members?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setActive(data.totalActive);
      setInvited(data.totalInvited);
      setMembers((prev) => (reset ? data.members : [...prev, ...data.members]));
      setCursor(data.nextCursor);
    };

    if (reset) {
      startLoad(() => {
        void call();
      });
    } else {
      setLoadingMore(true);
      await call();
      setLoadingMore(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (poolFull) {
      setPoolFullDialog(true);
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`/api/org/${slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && typeof data.seatLimit === "number") {
          setPoolFullDialog(true);
          return;
        }
        flash(false, data.error ?? "Noe gikk galt");
        return;
      }
      flash(true, `Invitasjon sendt til ${inviteEmail}`);
      setInviteEmail("");
      fetchPage({ reset: true });
    } finally {
      setInviting(false);
    }
  }

  async function handleConfirmRemove() {
    if (!removeTarget) return;
    const { userId, status } = removeTarget;
    setRemoving(userId);
    try {
      const res = await fetch(`/api/org/${slug}/members/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash(false, data.error ?? "Kunne ikke fjerne medlem");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
      if (status === "active") setActive((n) => Math.max(0, n - 1));
      else if (status === "invited") setInvited((n) => Math.max(0, n - 1));
      flash(true, "Medlem fjernet");
      router.refresh();
    } finally {
      setRemoving(null);
      setRemoveTarget(null);
    }
  }

  const hasActiveFilters = query || statusFilter !== "all" || roleFilter !== "all";

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-[13px] shadow-lg ${
            toast.ok
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Medlemmer</h1>
          <p className="text-[13px] text-ink/50 mt-0.5">
            {active} aktive, {invited} inviterte.{" "}
            <a
              href={isAdmin ? `/org/${slug}/fakturering` : "#"}
              className="underline underline-offset-2 hover:text-ink"
            >
              {seatsUsed} av {seatLimit} lisenser
            </a>
          </p>
        </div>
      </div>

      <div className="border border-black/8 rounded-xl bg-bg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] text-ink/50">Lisenser</span>
          <span className="text-[12px] font-medium tabular-nums">
            {seatsUsed} / {seatLimit}
          </span>
        </div>
        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              poolFull ? "bg-red-500" : usagePct > 80 ? "bg-yellow-500" : "bg-ink"
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      {isAdmin && (
        <form onSubmit={handleInvite} className="flex gap-2 items-center">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border border-black/15 bg-bg focus-within:border-ink transition-colors">
            <UserPlus size={15} className="text-ink/40 shrink-0" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Inviter via epost"
              required
              disabled={poolFull}
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/40 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail || poolFull}
            className="px-4 py-2 rounded-lg bg-ink text-bg text-[13px] font-medium disabled:opacity-40 transition-opacity"
          >
            {inviting ? "Sender…" : poolFull ? "Pool full" : "Inviter"}
          </button>
        </form>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-black/15 bg-bg focus-within:border-ink transition-colors">
          <Search size={15} className="text-ink/40 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk navn eller epost…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-ink/40 hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-black/15 rounded-lg px-2.5 py-2 text-[13px] bg-bg outline-none focus:border-ink cursor-pointer"
        >
          <option value="all">Alle statuser</option>
          <option value="active">Aktive</option>
          <option value="invited">Inviterte</option>
          <option value="suspended">Suspenderte</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="border border-black/15 rounded-lg px-2.5 py-2 text-[13px] bg-bg outline-none focus:border-ink cursor-pointer"
        >
          <option value="all">Alle roller</option>
          <option value="admin">Admin</option>
          <option value="member">Medlem</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-black/15 rounded-lg px-2.5 py-2 text-[13px] bg-bg outline-none focus:border-ink cursor-pointer"
        >
          <option value="recent">Sist lagt til</option>
          <option value="name">Navn A–Å</option>
          <option value="email">Epost A–Å</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
              setRoleFilter("all");
            }}
            className="text-[12px] text-ink/50 hover:text-ink px-2 py-1"
          >
            Nullstill
          </button>
        )}
      </div>

      <div className="border border-black/8 rounded-xl overflow-hidden divide-y divide-black/6 bg-bg">
        {loading && members.length === 0 && (
          <div className="py-12 text-center text-[13px] text-ink/40">Laster…</div>
        )}
        {!loading && members.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[13px] text-ink/50">
              {hasActiveFilters ? "Ingen treff" : "Ingen medlemmer ennå"}
            </p>
          </div>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="px-4 py-3 flex items-center gap-3 hover:bg-black/[0.015] transition-colors"
          >
            {m.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.user.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                  m.role === "admin"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-black/8 text-ink/60"
                }`}
              >
                {initialsFor(m.user.name, m.user.email)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[13px] font-medium truncate">
                  {m.user.name ?? m.user.email}
                </span>
                {m.role === "admin" && (
                  <span className="text-[10px] text-amber-700 font-medium shrink-0">
                    admin
                  </span>
                )}
              </div>
              <div className="text-[12px] text-ink/40 truncate">{m.user.email}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  STATUS_CLASSES[m.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {STATUS_LABELS[m.status] ?? m.status}
              </span>
              <span className="text-[12px] text-ink/30 tabular-nums w-16 text-right">
                {format(new Date(m.createdAt), "d. MMM", { locale: nb })}
              </span>
              {isAdmin && m.status !== "suspended" && (
                <button
                  onClick={() =>
                    setRemoveTarget({
                      userId: m.user.id,
                      name: m.user.name ?? m.user.email,
                      email: m.user.email,
                      status: m.status,
                    })
                  }
                  disabled={removing === m.user.id}
                  className="text-[11px] px-2 py-1 rounded border border-black/10 text-ink/40 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40"
                >
                  {removing === m.user.id ? "…" : "Fjern"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cursor && (
        <button
          type="button"
          onClick={() => fetchPage({ reset: false })}
          disabled={loadingMore}
          className="w-full py-3 rounded-lg border border-black/10 text-[13px] text-ink/60 hover:text-ink hover:border-black/20 transition-colors disabled:opacity-40"
        >
          {loadingMore ? "Laster flere…" : "Last flere"}
        </button>
      )}

      {removeTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => removing === null && setRemoveTarget(null)}
        >
          <div
            className="bg-bg rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-semibold mb-2">Fjern medlem</h3>
            <p className="text-[13px] text-ink/60 mb-1">
              <span className="font-medium text-ink">{removeTarget.name}</span> mister tilgang
              til organisasjonen.
            </p>
            <p className="text-[12px] text-ink/40 mb-5">
              Lisensen frigjøres tilbake til poolen, men antall kjøpte lisenser endres ikke.
              Personlig data forblir tilgjengelig for brukeren selv.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRemoveTarget(null)}
                disabled={removing !== null}
                className="px-4 py-2 rounded-full text-[13px] hover:bg-black/5 disabled:opacity-40"
              >
                Avbryt
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removing !== null}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-[13px] hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {removing !== null ? "Fjerner…" : "Fjern medlem"}
              </button>
            </div>
          </div>
        </div>
      )}

      {poolFullDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setPoolFullDialog(false)}
        >
          <div
            className="bg-bg rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-semibold mb-2">Ingen ledige lisenser</h3>
            <p className="text-[13px] text-ink/60 mb-5">
              Alle {seatLimit} lisensene er i bruk. Kjøp flere for å invitere nye medlemmer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPoolFullDialog(false)}
                className="px-4 py-2 rounded-full text-[13px] hover:bg-black/5"
              >
                Avbryt
              </button>
              {isAdmin && (
                <a
                  href={`/org/${slug}/fakturering`}
                  className="px-4 py-2 rounded-full bg-ink text-bg text-[13px]"
                >
                  Kjøp flere →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
