"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Normalises a user-supplied website string to a bare hostname suitable for
 * favicon lookups. Accepts full URLs, hostnames, or "example.com/path" forms.
 */
export function websiteToHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(prefixed);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return trimmed.replace(/^www\./i, "").toLowerCase().split("/")[0] || null;
  }
}

/** Google S2 favicon service — free, no key, cached edge-wide. */
function faviconUrl(host: string, size: number): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

type Size = "sm" | "md" | "lg" | "xl";

const DIM: Record<Size, { box: number; px: number; text: string }> = {
  sm: { box: 32, px: 64, text: "text-[10px]" },
  md: { box: 40, px: 64, text: "text-[11px]" },
  lg: { box: 56, px: 128, text: "text-[14px]" },
  xl: { box: 80, px: 128, text: "text-[20px]" },
};

export function CompanyLogo({
  website,
  name,
  size = "md",
  className,
}: {
  website?: string | null;
  name: string;
  size?: Size;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const host = websiteToHost(website);
  const dims = DIM[size];

  return (
    <div
      className={cn(
        "rounded-2xl bg-panel flex items-center justify-center text-[#14110e]/70 dark:text-[#f0ece6]/70 font-medium overflow-hidden shrink-0 border border-black/5 dark:border-white/5",
        dims.text,
        className,
      )}
      style={{ width: dims.box, height: dims.box }}
    >
      {host && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl(host, dims.px)}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
