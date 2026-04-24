"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { RoleSwitchDialog } from "./RoleSwitchDialog";
import type { UserRoles } from "@/lib/auth";

export function HotKeyListener() {
  const user = useAuthStore((state) => state.user);
  const [roles, setRoles] = useState<UserRoles | null>(null);
  const [showDialog, setShowDialog] = useState(false);

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
  }, [user]);

  const handleAdminHotkey = async () => {
    try {
      const response = await fetch("/api/auth/user-roles");
      if (!response.ok) return;

      const data: UserRoles = await response.json();
      setRoles(data);

      // If only internal admin, navigate directly
      if (data.isInternalAdmin && data.orgMemberships.length === 0) {
        window.location.href = "/admin";
        return;
      }

      // If only org owner with 1 org, navigate directly
      if (!data.isInternalAdmin && data.orgMemberships.length === 1) {
        window.location.href = `/org/${data.orgMemberships[0].slug}`;
        return;
      }

      // Otherwise show dialog
      setShowDialog(true);
    } catch (error) {
      console.error("Failed to fetch user roles:", error);
    }
  };

  if (!user || !roles) return null;

  return (
    <RoleSwitchDialog
      roles={roles}
      isOpen={showDialog}
      onClose={() => setShowDialog(false)}
    />
  );
}
