"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRoles } from "@/lib/auth";

interface RoleSwitchDialogProps {
  roles: UserRoles;
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSwitchDialog({
  roles,
  isOpen,
  onClose,
}: RoleSwitchDialogProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"admin" | "org">("admin");

  if (!isOpen) return null;

  const handleAdminClick = () => {
    onClose();
    router.push("/admin");
  };

  const handleOrgClick = (slug: string) => {
    onClose();
    router.push(`/org/${slug}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="border-b flex gap-0">
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "admin"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Intern admin
          </button>
          <button
            onClick={() => setActiveTab("org")}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "org"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Organisasjoner
          </button>
        </div>

        <div className="p-4">
          {activeTab === "admin" ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Gå til intern admin-panel
              </p>
              <button
                onClick={handleAdminClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Til admin
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Velg organisasjon:
              </p>
              <div className="space-y-2">
                {roles.orgMemberships.length > 0 ? (
                  roles.orgMemberships.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgClick(org.slug)}
                      className="w-full text-left px-3 py-2 rounded border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {org.displayName}
                      </div>
                      <div className="text-xs text-gray-500">{org.slug}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Ingen organisasjoner
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}
