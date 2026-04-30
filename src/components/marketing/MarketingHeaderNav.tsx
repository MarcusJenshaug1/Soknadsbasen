"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiMenu, FiX, FiArrowRight } from "react-icons/fi";
import { useAuthStore } from "@/store/useAuthStore";
import {
  PRIMARY_NAV,
  type NavSection,
} from "./marketing-nav-data";
import { cn } from "@/lib/cn";

function isActive(pathname: string, target: string) {
  if (target === "/") return pathname === "/";
  if (target.startsWith("/#") || target.startsWith("#")) return false;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function MarketingHeaderNav() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Hovedmeny"
        className="hidden md:flex items-center gap-1 text-[13px] flex-1 justify-center"
      >
        {PRIMARY_NAV.map((item) => {
          if (item.kind === "link") {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors",
                  active
                    ? "text-[#14110e]"
                    : "text-[#14110e]/65 hover:text-[#14110e]",
                )}
              >
                {item.dot ? (
                  <span
                    className="size-1.5 rounded-full bg-[#D5592E]"
                    aria-hidden
                  />
                ) : null}
                {item.label}
              </Link>
            );
          }
          const active = pathname.startsWith(item.activePrefix);
          const open = openMenu === item.key;
          return (
            <DesktopMenu
              key={item.key}
              label={item.label}
              active={active}
              open={open}
              onToggle={() => setOpenMenu(open ? null : item.key)}
              onClose={() => setOpenMenu(null)}
              sections={item.sections}
            />
          );
        })}
      </nav>

      <button
        type="button"
        className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full text-[#14110e] hover:bg-black/5 ml-auto"
        aria-label="Åpne meny"
        aria-expanded={drawerOpen}
        aria-controls="mobile-nav-drawer"
        onClick={() => setDrawerOpen(true)}
      >
        <FiMenu className="w-5 h-5" />
      </button>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

function DesktopMenu({
  label,
  active,
  open,
  onToggle,
  onClose,
  sections,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  sections: NavSection[];
}) {
  const panelId = useId();
  const wide = sections.some((s) => s.links.length > 6);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-2 rounded-full transition-colors",
          active || open
            ? "text-[#14110e]"
            : "text-[#14110e]/65 hover:text-[#14110e]",
        )}
      >
        {label}
        <FiChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            open ? "rotate-180" : "",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={label}
          className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 bg-[#faf8f5] border border-black/10 shadow-[0_24px_60px_-20px_rgba(20,17,14,0.18)] rounded-2xl p-6",
            wide ? "w-[640px]" : "w-[420px]",
          )}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        >
          <div
            className={cn(
              "grid gap-x-8 gap-y-6",
              sections.length > 1 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {sections.map((section) => (
              <MenuSection
                key={section.title}
                section={section}
                gridCols={wide && sections.length === 1 ? 2 : 1}
                onLinkClick={onClose}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuSection({
  section,
  gridCols,
  onLinkClick,
}: {
  section: NavSection;
  gridCols: 1 | 2;
  onLinkClick: () => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#14110e]/45 mb-3">
        {section.title}
      </div>
      <ul
        className={cn(
          "grid gap-1",
          gridCols === 2 ? "grid-cols-2 gap-x-4" : "grid-cols-1",
        )}
      >
        {section.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch
              onClick={onLinkClick}
              className="block rounded-lg px-2 py-1.5 hover:bg-black/[0.04] transition-colors"
            >
              <div className="text-[13px] text-[#14110e]">{link.label}</div>
              {link.description ? (
                <div className="text-[11px] text-[#14110e]/55 leading-snug">
                  {link.description}
                </div>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {section.viewAll ? (
        <Link
          href={section.viewAll.href}
          prefetch
          onClick={onLinkClick}
          className="inline-flex items-center gap-1 mt-3 text-[12px] text-[#D5592E] hover:text-[#a94424]"
        >
          {section.viewAll.label}
          <FiArrowRight className="w-3 h-3" />
        </Link>
      ) : null}
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const loggedIn = useAuthStore((s) => s.user !== null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && closeRef.current) closeRef.current.focus();
    if (!open) setExpandedKey(null);
  }, [open]);

  return (
    <div
      id="mobile-nav-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Meny"
      aria-hidden={!open}
      className={cn(
        "md:hidden fixed inset-0 z-[80] transition-opacity",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-[88%] max-w-[380px] bg-[#faf8f5] shadow-2xl flex flex-col transition-transform motion-reduce:transition-none",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-black/[0.06]">
          <span className="text-[12px] uppercase tracking-[0.18em] text-[#14110e]/45">
            Meny
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Lukk meny"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-[#14110e] hover:bg-black/5"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <nav
          aria-label="Mobilmeny"
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          <ul className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => {
              if (item.kind === "link") {
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      onClick={onClose}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl text-[15px] text-[#14110e] hover:bg-black/[0.04]"
                    >
                      {item.dot ? (
                        <span
                          className="size-1.5 rounded-full bg-[#D5592E]"
                          aria-hidden
                        />
                      ) : null}
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const expanded = expandedKey === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedKey(expanded ? null : item.key)
                    }
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-[15px] text-[#14110e] hover:bg-black/[0.04]"
                  >
                    <span>{item.label}</span>
                    <FiChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform motion-reduce:transition-none",
                        expanded ? "rotate-180" : "",
                      )}
                      aria-hidden
                    />
                  </button>
                  {expanded ? (
                    <div className="pl-3 pb-2">
                      {item.sections.map((section) => (
                        <div key={section.title} className="mt-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#14110e]/45 px-3 mb-1">
                            {section.title}
                          </div>
                          <ul>
                            {section.links.map((link) => (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  prefetch
                                  onClick={onClose}
                                  className="block px-3 py-2.5 text-[14px] text-[#14110e]/80 hover:text-[#14110e] hover:bg-black/[0.04] rounded-lg"
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                            {section.viewAll ? (
                              <li>
                                <Link
                                  href={section.viewAll.href}
                                  prefetch
                                  onClick={onClose}
                                  className="inline-flex items-center gap-1 px-3 py-2 text-[13px] text-[#D5592E] hover:text-[#a94424]"
                                >
                                  {section.viewAll.label}
                                  <FiArrowRight className="w-3 h-3" />
                                </Link>
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="px-4 pb-6 pt-4 border-t border-black/[0.06] flex flex-col gap-2">
          {loggedIn ? (
            <Link
              href="/app"
              onClick={onClose}
              className="flex items-center justify-center px-5 py-3.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium"
            >
              Åpne basen
            </Link>
          ) : (
            <>
              <Link
                href="/registrer"
                onClick={onClose}
                className="flex items-center justify-center px-5 py-3.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium"
              >
                Kom i gang
              </Link>
              <Link
                href="/logg-inn"
                onClick={onClose}
                className="flex items-center justify-center px-5 py-3.5 rounded-full border border-black/15 text-[#14110e] text-[14px]"
              >
                Logg inn
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
