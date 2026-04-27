"use client";

import { useEffect } from "react";
import { Building2, Briefcase, Zap } from "lucide-react";

interface DialogOption {
  label: string;
  href: string;
}

interface RoleSwitchDialogProps {
  options: DialogOption[];
  isOpen: boolean;
  onClose: () => void;
}

function getIcon(label: string) {
  if (label.includes("admin")) return <Briefcase size={16} />;
  if (label.includes("App")) return <Zap size={16} />;
  return <Building2 size={16} />;
}

function getCategory(label: string): "admin" | "app" | "org" {
  if (label.includes("admin")) return "admin";
  if (label.includes("App")) return "app";
  return "org";
}

export function RoleSwitchDialog({
  options,
  isOpen,
  onClose,
}: RoleSwitchDialogProps) {
  if (!isOpen || options.length === 0) return null;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleOptionClick = (href: string) => {
    onClose();
    window.location.href = href;
  };

  // Group options by category
  const adminOptions = options.filter((o) => getCategory(o.label) === "admin");
  const appOptions = options.filter((o) => getCategory(o.label) === "app");
  const orgOptions = options.filter((o) => getCategory(o.label) === "org");

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl shadow-xl max-w-sm w-full mx-4 border border-black/8 dark:border-white/8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[11px] uppercase tracking-wider text-ink/50 font-medium">
              Kontekstbytte
            </span>
          </div>
          <h2 className="text-[20px] font-semibold">Velg modus</h2>
          <p className="text-[13px] text-ink/40 mt-2">
            Trykk Ctrl+Shift+A fra ulike sider for å bytte raskt
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Admin */}
          {adminOptions.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink/50 font-medium mb-2.5">
                Plattform
              </p>
              <div className="space-y-2">
                {adminOptions.map((option) => (
                  <button
                    key={option.href}
                    onClick={() => handleOptionClick(option.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-panel hover:border-accent/50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                      {getIcon(option.label)}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-[14px] text-ink">
                        {option.label}
                      </div>
                      <div className="text-[11px] text-ink/40">
                        Intern admin-panel
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* App */}
          {appOptions.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink/50 font-medium mb-2.5">
                Personlig
              </p>
              <div className="space-y-2">
                {appOptions.map((option) => (
                  <button
                    key={option.href}
                    onClick={() => handleOptionClick(option.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-panel hover:border-accent/50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                      {getIcon(option.label)}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-[14px] text-ink">
                        {option.label}
                      </div>
                      <div className="text-[11px] text-ink/40">
                        Din personlige CV-base
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Orgs */}
          {orgOptions.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink/50 font-medium mb-2.5">
                Organisasjoner
              </p>
              <div className="space-y-2">
                {orgOptions.map((option) => (
                  <button
                    key={option.href}
                    onClick={() => handleOptionClick(option.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-panel hover:border-accent/50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                      {getIcon(option.label)}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-[14px] text-ink">
                        {option.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/8 dark:border-white/8 px-6 py-3 flex justify-between items-center bg-panel/30">
          <p className="text-[11px] text-ink/40">
            Esc for å lukke
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] text-ink/50 hover:text-ink transition-colors font-medium rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}
