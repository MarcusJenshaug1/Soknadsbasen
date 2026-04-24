"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  role: string;
  status: string;
  sharesDataWithOrg: boolean;
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  invited: "Invitert",
  suspended: "Suspendert",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Medlem",
};

function initialsFor(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "?";
  return source.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export function MedlemmerClient({
  initialMembers,
  callerRole,
  slug,
}: {
  initialMembers: Member[];
  callerRole: string;
  slug: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const isAdmin = callerRole === "admin";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/org/${slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteMsg({ ok: false, text: data.error ?? "Noe gikk galt" }); return; }
      setInviteMsg({ ok: true, text: `Invitasjon sendt til ${inviteEmail}` });
      setInviteEmail("");
      router.refresh();
    } catch {
      setInviteMsg({ ok: false, text: "Noe gikk galt" });
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId);
    try {
      const res = await fetch(`/api/org/${slug}/members/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user.id !== userId));
        router.refresh();
      }
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-8">
      {isAdmin && (
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="epost@eksempel.no"
            required
            className="flex-1 border-b border-black/20 bg-transparent py-2 text-[14px] outline-none focus:border-ink transition-colors placeholder:text-ink/40"
          />
          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="px-5 py-2 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40"
          >
            {inviting ? "Sender…" : "Inviter"}
          </button>
        </form>
      )}
      {inviteMsg && (
        <p className={`text-[13px] ${inviteMsg.ok ? "text-green-700" : "text-red-600"}`}>
          {inviteMsg.text}
        </p>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-2xl border border-black/8 p-4"
          >
            <div className="w-9 h-9 rounded-full bg-panel text-[11px] font-medium flex items-center justify-center shrink-0 overflow-hidden">
              {m.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initialsFor(m.user.name, m.user.email)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">
                {m.user.name ?? m.user.email}
              </div>
              <div className="text-[12px] text-ink/50 truncate">{m.user.email}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-panel text-ink/60">
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                m.status === "active" ? "bg-green-100 text-green-700" :
                m.status === "invited" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-600"
              }`}>
                {STATUS_LABELS[m.status] ?? m.status}
              </span>
              {isAdmin && m.status === "active" && (
                <button
                  onClick={() => handleRemove(m.user.id)}
                  disabled={removing === m.user.id}
                  className="text-[12px] text-ink/40 hover:text-red-600 transition-colors disabled:opacity-40 ml-1"
                >
                  {removing === m.user.id ? "…" : "Fjern"}
                </button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-[13px] text-ink/50 py-4 text-center">Ingen medlemmer ennå.</p>
        )}
      </div>
    </div>
  );
}
