"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Mail, MessageSquare } from "lucide-react";

interface Inquiry {
  id: string;
  orgName: string;
  contactName: string;
  contactEmail: string;
  message: string | null;
  status: string;
  createdAt: string;
}

export function OrgInquiriesClient({ initial }: { initial: Inquiry[] }) {
  const [items, setItems] = useState(initial);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    }
  }

  const pending = items.filter((i) => i.status === "pending");
  const other = items.filter((i) => i.status !== "pending");

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[13px] font-medium text-ink/70">Org-forespørsler</h2>
        {pending.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            {pending.length} ny{pending.length !== 1 ? "e" : ""}
          </span>
        )}
      </div>

      <div className="border border-black/8 rounded-xl overflow-hidden divide-y divide-black/6">
        {[...pending, ...other].map((inq) => (
          <div key={inq.id} className={`px-4 py-3 bg-bg flex items-start gap-3 ${inq.status !== "pending" ? "opacity-50" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={14} className="text-amber-700" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">{inq.orgName}</div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-[12px] text-ink/50">{inq.contactName}</span>
                <a
                  href={`mailto:${inq.contactEmail}`}
                  className="flex items-center gap-1 text-[12px] text-ink/50 hover:text-accent transition-colors"
                >
                  <Mail size={11} />
                  {inq.contactEmail}
                </a>
              </div>
              {inq.message && (
                <div className="flex items-start gap-1.5 mt-1.5">
                  <MessageSquare size={11} className="text-ink/30 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-ink/50 leading-relaxed">{inq.message}</p>
                </div>
              )}
              <p className="text-[11px] text-ink/30 mt-1">
                {new Date(inq.createdAt).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {inq.status === "pending" && (
                <>
                  <Link
                    href={`/admin/orger/ny?email=${encodeURIComponent(inq.contactEmail)}&org=${encodeURIComponent(inq.orgName)}`}
                    className="px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] font-medium hover:opacity-80 transition-opacity"
                  >
                    Opprett org
                  </Link>
                  <button
                    onClick={() => setStatus(inq.id, "contacted")}
                    className="px-3 py-1.5 rounded-full border border-black/15 text-[12px] text-ink/60 hover:text-ink hover:border-black/30 transition-colors"
                  >
                    Kontaktet
                  </button>
                  <button
                    onClick={() => setStatus(inq.id, "dismissed")}
                    className="px-3 py-1.5 rounded-full border border-black/10 text-[12px] text-ink/40 hover:text-ink/60 transition-colors"
                  >
                    Avvis
                  </button>
                </>
              )}
              {inq.status !== "pending" && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  inq.status === "contacted" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                }`}>
                  {inq.status === "contacted" ? "Kontaktet" : "Avvist"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
