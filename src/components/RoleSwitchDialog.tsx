"use client";

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
  if (!isOpen) return null;

  const handleAdminClick = () => {
    onClose();
    window.location.href = "/admin";
  };

  const handleOrgClick = (slug: string) => {
    onClose();
    window.location.href = `/org/${slug}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl shadow-xl max-w-sm w-full mx-4 border border-black/8 dark:border-white/8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-[18px] font-semibold mb-6">Velg modus</h2>

          <div className="space-y-3">
            <button
              onClick={handleAdminClick}
              className="w-full px-4 py-3 rounded-full bg-accent hover:bg-[#a94424] dark:hover:bg-[#c45830] text-bg font-medium text-[14px] transition-colors"
            >
              Intern admin
            </button>

            {roles.orgMemberships.length > 0 && (
              <div className="space-y-2">
                <p className="text-[12px] uppercase tracking-wider text-ink/50 px-1">
                  Organisasjoner
                </p>
                {roles.orgMemberships.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOrgClick(org.slug)}
                    className="w-full text-left px-4 py-3 rounded-full border border-black/15 dark:border-white/15 hover:bg-panel hover:border-accent transition-colors"
                  >
                    <div className="font-medium text-[14px] text-ink">
                      {org.displayName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-black/8 dark:border-white/8 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-ink/50 hover:text-ink transition-colors font-medium"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}
