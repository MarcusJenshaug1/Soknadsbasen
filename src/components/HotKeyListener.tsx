"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AppLoader } from "@/components/app-shell/AppLoader";
import { RoleSwitchDialog } from "./RoleSwitchDialog";
import type { UserRoles } from "@/lib/auth";

interface DialogOption {
  label: string;
  href: string;
}

export function HotKeyListener() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const rolesCache = useRef<UserRoles | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<DialogOption[]>([]);
  const [navigating, setNavigating] = useState(false);

  // Fetch roles once on mount og prefetch tilgjengelige targets slik at
  // Ctrl+Shift+A-bytte gar mest mulig direkte gjennom Next sin RSC-cache.
  useEffect(() => {
    if (!user) return;

    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/auth/user-roles");
        if (response.ok) {
          const roles = (await response.json()) as UserRoles;
          rolesCache.current = roles;
          if (roles.isInternalAdmin) router.prefetch("/admin");
          if (roles.isInternalAdmin || roles.orgMemberships.length > 0)
            router.prefetch("/app");
          if (roles.isInternalAdmin || roles.isSalesRep)
            router.prefetch("/selger");
          roles.orgMemberships.forEach((org) => {
            router.prefetch(`/org/${org.slug}`);
          });
        }
      } catch (error) {
        console.error("Failed to fetch user roles:", error);
      }
    };

    fetchRoles();
  }, [user, router]);

  useEffect(() => {
    if (!user) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl+Shift+A (Windows) or Cmd+Shift+A (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
        e.preventDefault();
        handleAdminHotkey();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user, pathname]);

  const detectContext = () => {
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/org/")) return "org";
    if (pathname.startsWith("/app")) return "app";
    if (pathname.startsWith("/selger")) return "selger";
    return null;
  };

  const getCurrentOrgSlug = () => {
    const match = pathname.match(/^\/org\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const handleAdminHotkey = () => {
    if (!rolesCache.current) return;

    const data = rolesCache.current;
    const context = detectContext();
    const options: DialogOption[] = [];

    // No accessible context = no action
    if (
      !data.isInternalAdmin &&
      !data.isSalesRep &&
      data.orgMemberships.length === 0
    ) {
      return;
    }

    // Add admin option if user is admin and not currently on /admin
    if (data.isInternalAdmin && context !== "admin") {
      options.push({ label: "Intern admin", href: "/admin" });
    }

    // Add app option if not currently on /app (accessible if admin or any org access)
    if (
      context !== "app" &&
      (data.isInternalAdmin || data.orgMemberships.length > 0)
    ) {
      options.push({ label: "App", href: "/app" });
    }

    // Add selger option if user is admin or active sales rep, and not currently on /selger
    if (
      context !== "selger" &&
      (data.isInternalAdmin || data.isSalesRep)
    ) {
      options.push({ label: "Selger", href: "/selger" });
    }

    // Add org options if user has any orgs
    const currentOrgSlug = getCurrentOrgSlug();
    data.orgMemberships.forEach((org) => {
      if (org.slug !== currentOrgSlug) {
        options.push({ label: org.displayName, href: `/org/${org.slug}` });
      }
    });

    // No options = no alternative context
    if (options.length === 0) return;

    // Single option = direct redirect
    if (options.length === 1) {
      setNavigating(true);
      window.location.assign(options[0].href);
      return;
    }

    // Multiple options = show dialog
    setDialogOptions(options);
    setShowDialog(true);
  };

  if (!user || !rolesCache.current) return null;

  return (
    <>
      {navigating && <AppLoader />}
      <RoleSwitchDialog
        options={dialogOptions}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onNavigate={() => setNavigating(true)}
      />
    </>
  );
}
