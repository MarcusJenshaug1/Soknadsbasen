"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, type AnchorHTMLAttributes, type ReactNode } from "react";

type Props = Omit<LinkProps, "prefetch"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

/**
 * Link som prefetcher dynamiske ruter på hover/focus i stedet for ved
 * intersection — sparer RSC-fetches på sider som rendrer mange kort
 * (kanban, lister) hvor Next default-prefetch={true} ville fyrt 10-20
 * parallelle requests.
 *
 * Bruker router.prefetch() én gang per link, debouncet via en ref.
 */
export function PrefetchLink({
  href,
  children,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...rest
}: Props) {
  const router = useRouter();
  const prefetched = useRef(false);

  const trigger = useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;
    const target = typeof href === "string" ? href : href.pathname ?? "";
    if (target) router.prefetch(target);
  }, [href, router]);

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        trigger();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        trigger();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        trigger();
        onTouchStart?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
