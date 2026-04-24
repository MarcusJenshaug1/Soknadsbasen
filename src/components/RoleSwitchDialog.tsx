"use client";

interface DialogOption {
  label: string;
  href: string;
}

interface RoleSwitchDialogProps {
  options: DialogOption[];
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSwitchDialog({
  options,
  isOpen,
  onClose,
}: RoleSwitchDialogProps) {
  if (!isOpen || options.length === 0) return null;

  const handleOptionClick = (href: string) => {
    onClose();
    window.location.href = href;
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
          <h2 className="text-[18px] font-semibold mb-6">Velg kontekst</h2>

          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option.href}
                onClick={() => handleOptionClick(option.href)}
                className="w-full text-left px-4 py-3 rounded-full border border-black/15 dark:border-white/15 hover:bg-panel hover:border-accent transition-colors"
              >
                <div className="font-medium text-[14px] text-ink">
                  {option.label}
                </div>
              </button>
            ))}
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
