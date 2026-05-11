"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, FileUp, Plus, Copy, Trash2, Pencil, Check, ChevronDown, Eye, PenTool } from "lucide-react";
import { LivePreview, PrintOutput } from "./LivePreview";
import { useResumeStore, type ResumeEntry } from "@/store/useResumeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCloudSyncStore } from "@/store/useCloudSyncStore";
import { ImportCVModal } from "./ImportCVModal";
import { AvatarCropper } from "./AvatarCropper";
import {
  RoleForm,
  ExperienceForm,
  EducationForm,
  SkillsForm,
  SummaryForm,
  LanguagesForm,
  ExtraSectionsForm,
  DesignExportForm,
} from "./forms/EditorForms";

const STEPS = [
  { id: "contact", title: "Kontaktinfo" },
  { id: "role", title: "Ønsket Rolle" },
  { id: "summary", title: "Profil" },
  { id: "experience", title: "Erfaring" },
  { id: "education", title: "Utdanning" },
  { id: "skills", title: "Ferdigheter" },
  { id: "languages", title: "Språk" },
  { id: "extra", title: "Ekstra seksjoner" },
  { id: "design", title: "Design & Eksport" },
];

export function ResumeEditor() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

  // Vent på useCloudSync.loadFromServer (eller dens fall-through når
  // serveren returnerer mismatch/feil). Persist-laget er fjernet, så
  // første render har bare default-state inntil server har svart.
  const isLoaded = useResumeStore((s) => s.isLoaded);

  // Speil currentStep til useCloudSyncStore så Realtime Presence kan
  // kringkaste hvilken seksjon jeg er på til andre collaborators.
  const setSyncStep = useCloudSyncStore((s) => s.setCurrentStep);
  useEffect(() => {
    setSyncStep(currentStep);
  }, [currentStep, setSyncStep]);

  const nextStep = () => setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 0));

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20 text-[12px] uppercase tracking-[0.2em] text-[#14110e]/45 dark:text-[#f0ece6]/45">
        Laster CV-data
      </div>
    );
  }

  return (
    <>
      <PrintOutput />
      <LiveCursorsLayer />
      <ImportCVModal open={showImport} onClose={() => setShowImport(false)} />

      <div className="flex flex-col h-[calc(100dvh-80px)] md:h-[calc(100dvh-20px)] bg-bg print:hidden">
        {/* Top strip: CV switcher + import + step counter + mobile view toggle */}
        <div className="px-5 md:px-10 pt-5 md:pt-8 pb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-2">
              Min CV
            </div>
            <h1 className="text-[28px] md:text-[36px] leading-[1] tracking-[-0.03em] font-medium">
              {STEPS[currentStep].title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CollaboratorBar />
            <CVSwitcher />
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-black/10 dark:border-white/10 text-[12px] text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors"
            >
              <FileUp className="size-3.5" />
              Importer PDF
            </button>
            <SaveStatusIndicator />
          </div>
        </div>

        {/* Step tabs */}
        <div className="px-5 md:px-10 pb-4 overflow-x-auto no-scrollbar">
          <div className="inline-flex gap-1 bg-panel rounded-full p-1 whitespace-nowrap">
            {STEPS.map((step, index) => (
              <StepTab
                key={step.id}
                index={index}
                title={step.title}
                active={currentStep === index}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>
        </div>

        {/* Mobile view toggle */}
        <div className="md:hidden px-5 pb-2">
          <div className="inline-flex gap-1 bg-[#eee9df] rounded-full p-1">
            <button
              onClick={() => setMobileView("editor")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] transition-colors ${
                mobileView === "editor"
                  ? "bg-bg text-ink font-medium"
                  : "text-[#14110e]/60 dark:text-[#f0ece6]/60"
              }`}
            >
              <PenTool className="size-3" /> Rediger
            </button>
            <button
              onClick={() => setMobileView("preview")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] transition-colors ${
                mobileView === "preview"
                  ? "bg-bg text-ink font-medium"
                  : "text-[#14110e]/60 dark:text-[#f0ece6]/60"
              }`}
            >
              <Eye className="size-3" /> Forhåndsvis
            </button>
          </div>
        </div>

        {/* Editor + Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div
            className={`${mobileView === "editor" ? "flex" : "hidden"} md:flex w-full md:w-[45%] lg:w-[40%] overflow-y-auto px-5 md:px-10 pb-8 bg-surface md:border-r border-black/8 dark:border-white/8`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="max-w-2xl mx-auto pb-20 w-full"
              >
                {currentStep === 0 && <ContactForm />}
                {currentStep === 1 && <RoleForm />}
                {currentStep === 2 && <SummaryForm />}
                {currentStep === 3 && <ExperienceForm />}
                {currentStep === 4 && <EducationForm />}
                {currentStep === 5 && <SkillsForm />}
                {currentStep === 6 && <LanguagesForm />}
                {currentStep === 7 && <ExtraSectionsForm />}
                {currentStep === 8 && <DesignExportForm />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className={`${mobileView === "preview" ? "flex" : "hidden"} md:flex w-full md:w-[55%] lg:w-[60%] bg-panel overflow-y-auto px-2 md:px-4 py-4 md:py-8 justify-center items-start`}
          >
            <LivePreview />
          </div>
        </div>

        {/* Footer nav */}
        <footer className="p-3 md:p-4 border-t border-black/8 dark:border-white/8 bg-bg flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-40 border border-black/15 dark:border-white/15 bg-surface text-ink hover:border-black/30 dark:hover:border-white/30"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Tilbake</span>
          </button>
          <span className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45">
            {currentStep + 1} / {STEPS.length}
          </span>
          <button
            onClick={nextStep}
            disabled={currentStep === STEPS.length - 1}
            className="inline-flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-40 bg-accent text-bg hover:bg-[#a94424] dark:hover:bg-[#c45830]"
          >
            <span className="hidden sm:inline">Neste steg</span>
            <span className="sm:hidden">Neste</span>
            <ChevronRight className="size-4" />
          </button>
        </footer>
      </div>
    </>
  );
}

/* ─── Live collaboration: presence-bar + step-tab markers ─── */

// Tildelt-farger per clientId (stabil mapping så samme bruker har samme
// farge på tvers av step-tab og chip i bar-en).
const COLLAB_COLORS = [
  "#D5592E", // accent oransje
  "#2563eb", // blå
  "#16a34a", // grønn
  "#9333ea", // lilla
  "#db2777", // rosa
  "#0891b2", // cyan
];

function colorForClientId(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) | 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

function initialsOf(name: string | null, email: string): string {
  const base = (name?.trim() || email).trim();
  const parts = base.split(/\s+|@/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

function StepTab({
  index,
  title,
  active,
  onClick,
}: {
  index: number;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  // VIKTIG: select hele lista, IKKE .filter() i selector — ny array hver
  // render trigger Zustand re-render-loop (Maximum update depth #185).
  const allCollaborators = useCloudSyncStore((s) => s.collaborators);
  const collaboratorsHere = useMemo(
    () => allCollaborators.filter((c) => c.step === index),
    [allCollaborators, index],
  );

  const primaryColor =
    collaboratorsHere.length > 0
      ? colorForClientId(collaboratorsHere[0].clientId)
      : null;

  return (
    <button
      onClick={onClick}
      className={`relative px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-[12px] transition-all ${
        active
          ? "bg-bg text-ink font-medium"
          : "text-[#14110e]/60 dark:text-[#f0ece6]/60 hover:text-ink"
      }`}
      style={
        primaryColor
          ? {
              boxShadow: `0 0 0 2px ${primaryColor}, 0 0 14px ${hexAlpha(primaryColor, 0.35)}`,
              animation: "collabPulse 1.6s ease-in-out infinite",
            }
          : undefined
      }
    >
      <span className="mr-1.5 text-[#14110e]/40 dark:text-[#f0ece6]/40">
        {index + 1}
      </span>
      {title}
      {collaboratorsHere.length > 0 && (
        <span className="absolute -top-2 -right-2 flex -space-x-1.5 pointer-events-none">
          {collaboratorsHere.slice(0, 2).map((c) => {
            const color = colorForClientId(c.clientId);
            const tooltip = `${c.name ?? c.email}${c.impersonating ? " (admin)" : ""} er her`;
            return (
              <span
                key={c.clientId}
                title={tooltip}
                className="w-5 h-5 rounded-full ring-2 ring-bg overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                style={{ background: color }}
              >
                {c.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.avatarUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initialsOf(c.name, c.email).slice(0, 1)
                )}
              </span>
            );
          })}
          {collaboratorsHere.length > 2 && (
            <span className="w-5 h-5 rounded-full ring-2 ring-bg bg-ink text-bg text-[8px] font-bold flex items-center justify-center">
              +{collaboratorsHere.length - 2}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function CollaboratorBar() {
  const collaborators = useCloudSyncStore((s) => s.collaborators);
  if (collaborators.length === 0) return null;

  return (
    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[11px] text-emerald-800 dark:text-emerald-200 font-medium">
        Live
      </span>
      <div className="flex -space-x-1.5 ml-1">
        {collaborators.slice(0, 3).map((c) => {
          const color = colorForClientId(c.clientId);
          const stepLabel = STEPS[c.step]?.title ?? "ukjent";
          const focusBit = c.focusLabel ? ` › ${c.focusLabel}` : "";
          const adminBit = c.impersonating ? " (admin)" : "";
          const tooltip = `${c.name ?? c.email}${adminBit} redigerer ${stepLabel}${focusBit}`;
          return (
            <div
              key={c.clientId}
              title={tooltip}
              className="w-6 h-6 rounded-full ring-2 ring-bg overflow-hidden flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ background: color }}
            >
              {c.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.avatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initialsOf(c.name, c.email)}</span>
              )}
            </div>
          );
        })}
      </div>
      {collaborators.length > 3 && (
        <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
          +{collaborators.length - 3}
        </span>
      )}
    </div>
  );
}

function LiveCursorsLayer() {
  const collaborators = useCloudSyncStore((s) => s.collaborators);

  // Mal collab-cursor-bordere på input-feltene via DOM-manipulasjon
  // (utenfor React-render-treet for å unngå render-storm + å slippe å
  // wrappe hvert input i en custom komponent).
  useFieldHighlights(collaborators);

  if (collaborators.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[80] print:hidden">
      {collaborators.map((c) => {
        const color = colorForClientId(c.clientId);
        return (
          <div
            key={c.clientId}
            data-cursor-id={c.clientId}
            className="absolute top-0 left-0 transition-transform duration-[40ms] ease-linear pointer-events-none opacity-0"
            style={{
              transform:
                "translate(var(--cursor-x, -100px), var(--cursor-y, -100px))",
              willChange: "transform",
            }}
          >
            {/* SVG-tippen er på (0,0) så translate(x,y) lander spissen
                eksakt på avsenderens cursor-koordinat. */}
            <svg
              width="14"
              height="18"
              viewBox="0 0 14 18"
              className="drop-shadow"
              style={{ display: "block" }}
            >
              <path
                d="M0 0 L12 8 L6 9 L3 15 Z"
                fill={color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            <span
              className="absolute left-3 top-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white whitespace-nowrap shadow"
              style={{ background: color }}
            >
              {c.name?.split(" ")[0] || c.email.split("@")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Maler colored border + small badge på inputet som hver collaborator har
 * fokus på. Reverse-lookup fra focusLabel via aria-label/label-text/placeholder.
 * Kjører i useEffect så den ryddes opp ved unmount.
 */
function useFieldHighlights(
  collaborators: ReturnType<typeof useCloudSyncStore.getState>["collaborators"],
) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    type Cleanup = () => void;
    const cleanups: Cleanup[] = [];

    for (const c of collaborators) {
      if (!c.focusLabel && !c.focusFieldId) continue;
      const found = findInputForCollaborator(c.focusFieldId, c.focusLabel);
      if (!found) continue;
      const el: HTMLElement = found;
      const color = colorForClientId(c.clientId);
      const prevBoxShadow = el.style.boxShadow;
      const prevTransition = el.style.transition;
      el.style.boxShadow = `0 0 0 2px ${color}, 0 4px 12px ${hexAlpha(color, 0.22)}`;
      el.style.transition = "box-shadow 120ms ease";

      // Liten flytende navn-badge over feltet
      const badge = document.createElement("div");
      badge.setAttribute("data-collab-badge", c.clientId);
      badge.textContent =
        (c.name?.split(" ")[0] || c.email.split("@")[0]) +
        (c.impersonating ? " (admin)" : "");
      Object.assign(badge.style, {
        position: "fixed",
        pointerEvents: "none",
        padding: "2px 8px",
        borderRadius: "9999px",
        background: color,
        color: "white",
        fontSize: "10px",
        fontWeight: "600",
        whiteSpace: "nowrap",
        zIndex: "70",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      } satisfies Partial<CSSStyleDeclaration>);

      function positionBadge() {
        const rect = el.getBoundingClientRect();
        badge.style.left = `${Math.round(rect.left)}px`;
        badge.style.top = `${Math.round(rect.top - 22)}px`;
      }
      positionBadge();
      document.body.appendChild(badge);

      // Hold badge-en låst til input-rect på resize/scroll
      const reposition = () => positionBadge();
      window.addEventListener("scroll", reposition, true);
      window.addEventListener("resize", reposition);

      cleanups.push(() => {
        el.style.boxShadow = prevBoxShadow;
        el.style.transition = prevTransition;
        badge.remove();
        window.removeEventListener("scroll", reposition, true);
        window.removeEventListener("resize", reposition);
      });
    }

    return () => {
      for (const c of cleanups) c();
    };
  }, [collaborators]);
}

/**
 * Finn input som tilhører en collaborators fokus-felt. Foretrekker stabil
 * data-cv-field-id; faller tilbake til label-streng-matching.
 */
function findInputForCollaborator(
  fieldId: string | null,
  label: string | null,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  if (fieldId) {
    const byField = document.querySelector<HTMLElement>(
      `[data-cv-field="${cssEscape(fieldId)}"]`,
    );
    if (
      byField instanceof HTMLInputElement ||
      byField instanceof HTMLTextAreaElement ||
      byField instanceof HTMLSelectElement
    ) {
      return byField;
    }
  }
  if (label) return findInputByLabel(label);
  return null;
}

/**
 * Finn input/textarea/select som matcher en label-streng. Speilbilde av
 * resolveFieldLabel i useCloudSync.
 */
function findInputByLabel(
  label: string,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  // 1. aria-label exact match
  const aria = document.querySelector<HTMLElement>(
    `input[aria-label="${cssEscape(trimmed)}"], textarea[aria-label="${cssEscape(trimmed)}"], select[aria-label="${cssEscape(trimmed)}"]`,
  );
  if (aria) return aria as HTMLInputElement;

  // 2. <label> text exact match → for-id / wrapped / sibling
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
  for (const l of labels) {
    const t = l.textContent?.trim();
    if (t !== trimmed) continue;
    const forId = l.getAttribute("for");
    if (forId) {
      const target = document.getElementById(forId);
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return target;
      }
    }
    const wrapped = l.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select");
    if (wrapped) return wrapped;
    // Søsken-input i samme container (ContactForm-mønster)
    const sibling = l.parentElement?.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select");
    if (sibling) return sibling;
  }

  // 3. placeholder exact match
  const ph = document.querySelector<HTMLElement>(
    `input[placeholder="${cssEscape(trimmed)}"], textarea[placeholder="${cssEscape(trimmed)}"]`,
  );
  if (ph) return ph as HTMLInputElement;

  return null;
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/(["\\\]:.])/g, "\\$1");
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function SaveStatusIndicator() {
  const status = useCloudSyncStore((s) => s.status);
  const lastSavedAt = useCloudSyncStore((s) => s.lastSavedAt);
  const [now, setNow] = useState(() => Date.now());

  // Tick hvert 10. sek så "Lagret X sek siden" oppdaterer seg uten render-loop.
  useEffect(() => {
    if (status !== "saved" || lastSavedAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, [status, lastSavedAt]);

  const label =
    status === "saving"
      ? "Lagrer…"
      : status === "dirty"
        ? "Endringer ulagret"
        : status === "error"
          ? "Lagring feilet, prøver igjen"
          : status === "saved" && lastSavedAt != null
            ? `Lagret ${formatAgo(now - lastSavedAt)}`
            : "Lagres automatisk";

  const dot =
    status === "saving"
      ? "bg-amber-500 animate-pulse"
      : status === "dirty"
        ? "bg-amber-400"
        : status === "error"
          ? "bg-red-500"
          : status === "saved"
            ? "bg-emerald-500"
            : "bg-[#14110e]/25 dark:bg-[#f0ece6]/25";

  return (
    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

function formatAgo(ms: number): string {
  const sec = Math.max(1, Math.round(ms / 1000));
  if (sec < 60) return `${sec} sek siden`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min siden`;
  const hr = Math.round(min / 60);
  return `${hr} t siden`;
}

function ContactForm() {
  const data = useResumeStore((state) => state.data.contact);
  const updateContact = useResumeStore((state) => state.updateContact);
  const profileAvatar = useAuthStore((s) => s.user?.avatarUrl);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-black/12 dark:border-white/12 bg-surface text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Personalia</h3>
        <p className="text-sm text-ink/55">
          Start med å fylle ut det viktigste. Et bilde støttes i enkelte maler, men er avslått som standard.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink/80">Fornavn *</label>
          <input data-cv-field="contact.firstName" type="text" className={inputClass} placeholder="Ola" value={data.firstName} onChange={(e) => updateContact({ firstName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink/80">Etternavn *</label>
          <input data-cv-field="contact.lastName" type="text" className={inputClass} placeholder="Nordmann" value={data.lastName} onChange={(e) => updateContact({ lastName: e.target.value })} />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-sm font-medium text-ink/80">E-post *</label>
          <input data-cv-field="contact.email" type="email" className={inputClass} placeholder="ola.nordmann@epost.no" value={data.email} onChange={(e) => updateContact({ email: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink/80">Telefon</label>
          <input data-cv-field="contact.phone" type="tel" className={inputClass} placeholder="+47 000 00 000" value={data.phone} onChange={(e) => updateContact({ phone: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink/80">Sted</label>
          <input data-cv-field="contact.location" type="text" className={inputClass} placeholder="Oslo, Norge" value={data.location} onChange={(e) => updateContact({ location: e.target.value })} />
          <p className="text-xs text-ink/55 mt-1">Anbefalt: Kun By/Land.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink/80">LinkedIn</label>
          <input data-cv-field="contact.linkedin" type="url" className={inputClass} placeholder="https://linkedin.com/in/..." value={data.linkedin} onChange={(e) => updateContact({ linkedin: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink/80">Nettside / Portefølje</label>
          <input data-cv-field="contact.website" type="url" className={inputClass} placeholder="https://..." value={data.website} onChange={(e) => updateContact({ website: e.target.value })} />
        </div>

        <div className="space-y-1 col-span-2 mt-2 p-5 border rounded-2xl bg-surface border-black/8 dark:border-white/8">
          <div className="flex items-start justify-between">
            <div>
              <label className="text-sm font-semibold text-ink flex items-center gap-2">
                Bilde på CV <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] uppercase tracking-wider">Er valgfritt</span>
              </label>
              <p className="text-xs text-ink/55 mt-1.5 max-w-sm leading-relaxed">
                Å bruke bilde varierer etter marked og stilling. Det anbefales ofte ikke for internasjonale roller pga. diskrimineringslovgivning.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input type="checkbox" className="sr-only peer" checked={data.includePhoto} onChange={(e) => updateContact({ includePhoto: e.target.checked })} />
              <div className="w-11 h-6 bg-black/20 dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
          
          {data.includePhoto && cropFile && (
            <AvatarCropper
              file={cropFile}
              onCancel={() => setCropFile(null)}
              onConfirm={async (blob) => {
                setCropFile(null);
                const reader = new FileReader();
                reader.onloadend = () =>
                  updateContact({ photoUrl: reader.result as string });
                reader.readAsDataURL(blob);
              }}
            />
          )}
          {data.includePhoto && (
            <div className="mt-5 pt-5 border-t border-neutral-100 flex items-center gap-5">
              {data.photoUrl ? (
                <div className="relative size-16 rounded-full overflow-hidden border-2 border-[#eee9df] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.photoUrl}
                    alt="Profil"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="size-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-[10px] text-center border-2 border-dashed border-neutral-300 shrink-0">
                  Foto
                </div>
              )}
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCropFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-4 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] text-[12px] font-medium hover:bg-[#a94424] transition-colors"
                >
                  {data.photoUrl ? "Bytt bilde" : "Velg bilde"}
                </button>
                {profileAvatar && profileAvatar !== data.photoUrl && (
                  <button
                    type="button"
                    onClick={() => updateContact({ photoUrl: profileAvatar })}
                    className="px-4 py-2 rounded-full border border-black/15 text-[12px] hover:border-black/30 transition-colors"
                  >
                    Bruk profilbildet
                  </button>
                )}
                {data.photoUrl && (
                  <button
                    type="button"
                    onClick={() => updateContact({ photoUrl: "" })}
                    className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 hover:text-accent"
                  >
                    Fjern
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── CV Switcher ─────────────────────────────────────────── */

function CVSwitcher() {
  const resumes = useResumeStore((s) => s.resumes);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);
  const setActiveResume = useResumeStore((s) => s.setActiveResume);
  const addResume = useResumeStore((s) => s.addResume);
  const removeResume = useResumeStore((s) => s.removeResume);
  const renameResume = useResumeStore((s) => s.renameResume);
  const duplicateResume = useResumeStore((s) => s.duplicateResume);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeName = resumes.find((r) => r.id === activeResumeId)?.name ?? "CV";

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const startRename = (r: ResumeEntry) => {
    setEditingId(r.id);
    setEditName(r.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameResume(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-black/10 dark:border-white/10 text-[12px] text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors max-w-[220px]"
      >
        <span className="truncate">{activeName}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-2 left-0 w-64 rounded-2xl border border-black/8 dark:border-white/8 bg-surface overflow-hidden z-20"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className={`group flex items-center gap-1 px-3 py-2 text-[12px] transition-colors ${
                    r.id === activeResumeId
                      ? "bg-panel text-ink"
                      : "hover:bg-panel/50 text-ink/70"
                  }`}
                >
                  {editingId === r.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        commitRename();
                      }}
                      className="flex items-center gap-1 flex-1 min-w-0"
                    >
                      <input
                        ref={inputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitRename}
                        className="flex-1 min-w-0 px-2 py-1 rounded-md border border-[#D5592E] text-[12px] outline-none"
                      />
                      <button
                        type="submit"
                        className="p-0.5 text-[#D5592E]"
                      >
                        <Check className="size-3" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setActiveResume(r.id);
                          setOpen(false);
                        }}
                        className="flex-1 text-left truncate min-w-0"
                      >
                        {r.name}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startRename(r)}
                          className="p-1 hover:text-[#D5592E]"
                          title="Gi nytt navn"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => duplicateResume(r.id)}
                          className="p-1 hover:text-[#D5592E]"
                          title="Dupliser"
                        >
                          <Copy className="size-3" />
                        </button>
                        {resumes.length > 1 && (
                          <button
                            onClick={() => removeResume(r.id)}
                            className="p-1 hover:text-[#D5592E]"
                            title="Slett"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                addResume();
                setOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#D5592E] hover:bg-[#D5592E]/5 border-t border-black/8 transition-colors"
            >
              <Plus className="size-3.5" />
              Ny CV
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
