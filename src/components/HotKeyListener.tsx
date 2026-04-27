"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { RoleSwitchDialog } from "./RoleSwitchDialog";
import type { UserRoles } from "@/lib/auth";

interface DialogOption {
  label: string;
  href: string;
}

export function HotKeyListener() {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const rolesCache = useRef<UserRoles | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<DialogOption[]>([]);

  // Fetch roles once on mount
  useEffect(() => {
    if (!user) return;

    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/auth/user-roles");
        if (response.ok) {
          rolesCache.current = await response.json();
        }
      } catch (error) {
        console.error("Failed to fetch user roles:", error);
      }
    };

    fetchRoles();
  }, [user]);

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

    // Only org owner with no admin access and no platform access = no action
    if (!data.isInternalAdmin && data.orgMemberships.length === 0) {
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
      window.location.href = options[0].href;
      return;
    }

    // Multiple options = show dialog
    setDialogOptions(options);
    setShowDialog(true);
  };

  if (!user || !rolesCache.current) return null;

  return (
    <RoleSwitchDialog
      options={dialogOptions}
      isOpen={showDialog}
      onClose={() => setShowDialog(false)}
    />
  );
}
