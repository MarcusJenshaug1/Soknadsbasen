"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconCalendar } from "@/components/ui/Icons";

type Notif = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  sentAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.readAt).length;

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifs(data);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  function formatAge(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return "nå";
    if (h < 24) return `${h}t siden`;
    const d = Math.floor(h / 24);
    return `${d}d siden`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unread > 0) markAllRead();
        }}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        aria-label="Varsler"
      >
        <IconCalendar size={18} className="text-[#14110e]/60 dark:text-[#f0ece6]/60" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-surface rounded-2xl shadow-xl border border-black/8 dark:border-white/8 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <span className="text-[12px] font-medium">Varsler</span>
            {unread > 0 && (
              <span className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45">{unread} ulest</span>
            )}
          </div>

          {!loaded ? (
            <div className="px-4 py-6 text-[12px] text-[#14110e]/45 dark:text-[#f0ece6]/45 text-center">Laster …</div>
          ) : notifs.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-[#14110e]/45 dark:text-[#f0ece6]/45 text-center">
              Ingen varsler ennå
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
              {notifs.map((n) => {
                const content = (
                  <div className={`px-4 py-3 ${!n.readAt ? "bg-bg" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium leading-snug">{n.title}</div>
                        <div className="text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mt-0.5 leading-snug">
                          {n.body}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#14110e]/35 dark:text-[#f0ece6]/35 shrink-0 mt-0.5">
                        {formatAge(n.sentAt)}
                      </span>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.url ? (
                      <Link href={n.url} onClick={() => setOpen(false)} className="block hover:bg-panel/50">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
