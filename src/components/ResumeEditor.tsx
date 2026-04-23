"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, FileUp, Plus, Copy, Trash2, Pencil, Check, ChevronDown, Eye, PenTool } from "lucide-react";
import { LivePreview, PrintOutput } from "./LivePreview";
import { useResumeStore, type ResumeEntry } from "@/store/useResumeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ImportCVModal } from "./ImportCVModal";
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
  const [hydrated, setHydrated] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

  useEffect(() => {
    // Wait for Zustand persist to finish rehydration from localStorage
    const unsub = useResumeStore.persist.onFinishHydration(() => setHydrated(true));
    if (useResumeStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const nextStep = () => setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 0));

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-[12px] uppercase tracking-[0.2em] text-[#14110e]/45">
        Laster CV-data
      </div>
    );
  }

  return (
    <>
      <PrintOutput />
      <ImportCVModal open={showImport} onClose={() => setShowImport(false)} />

      <div className="flex flex-col h-[calc(100dvh-80px)] md:h-[calc(100dvh-20px)] bg-[#faf8f5] print:hidden">
        {/* Top strip: CV switcher + import + step counter + mobile view toggle */}
        <div className="px-5 md:px-10 pt-5 md:pt-8 pb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/55 mb-2">
              Min CV
            </div>
            <h1 className="text-[28px] md:text-[36px] leading-[1] tracking-[-0.03em] font-medium">
              {STEPS[currentStep].title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CVSwitcher />
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-black/10 text-[12px] hover:border-black/30 transition-colors"
            >
              <FileUp className="size-3.5" />
              Importer PDF
            </button>
            <div className="hidden md:block text-[11px] text-[#14110e]/45">
              Lagres automatisk
            </div>
          </div>
        </div>

        {/* Step tabs */}
        <div className="px-5 md:px-10 pb-4 overflow-x-auto no-scrollbar">
          <div className="inline-flex gap-1 bg-[#eee9df] rounded-full p-1 whitespace-nowrap">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-[12px] transition-colors ${
                  currentStep === index
                    ? "bg-[#faf8f5] text-[#14110e] font-medium"
                    : "text-[#14110e]/60 hover:text-[#14110e]"
                }`}
              >
                <span className="mr-1.5 text-[#14110e]/40">{index + 1}</span>
                {step.title}
              </button>
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
                  ? "bg-[#faf8f5] text-[#14110e] font-medium"
                  : "text-[#14110e]/60"
              }`}
            >
              <PenTool className="size-3" /> Rediger
            </button>
            <button
              onClick={() => setMobileView("preview")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] transition-colors ${
                mobileView === "preview"
                  ? "bg-[#faf8f5] text-[#14110e] font-medium"
                  : "text-[#14110e]/60"
              }`}
            >
              <Eye className="size-3" /> Forhåndsvis
            </button>
          </div>
        </div>

        {/* Editor + Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div
            className={`${mobileView === "editor" ? "flex" : "hidden"} md:flex w-full md:w-[45%] lg:w-[40%] overflow-y-auto px-5 md:px-10 pb-8 bg-white md:border-r border-black/8`}
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
            className={`${mobileView === "preview" ? "flex" : "hidden"} md:flex w-full md:w-[55%] lg:w-[60%] bg-[#eee9df] overflow-y-auto px-2 md:px-4 py-4 md:py-8 justify-center items-start`}
          >
            <LivePreview />
          </div>
        </div>

        {/* Footer nav */}
        <footer className="p-3 md:p-4 border-t border-black/8 bg-[#faf8f5] flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-40 border border-black/15 bg-white hover:border-black/30"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Tilbake</span>
          </button>
          <span className="text-[11px] text-[#14110e]/45">
            {currentStep + 1} / {STEPS.length}
          </span>
          <button
            onClick={nextStep}
            disabled={currentStep === STEPS.length - 1}
            className="inline-flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-40 bg-[#14110e] text-[#faf8f5] hover:bg-[#c15a3a]"
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

function ContactForm() {
  const data = useResumeStore((state) => state.data.contact);
  const updateContact = useResumeStore((state) => state.updateContact);
  const profileAvatar = useAuthStore((s) => s.user?.avatarUrl);

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Personalia</h3>
        <p className="text-sm text-neutral-500">
          Start med å fylle ut det viktigste. Et bilde støttes i enkelte maler, men er avslått som standard.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Fornavn *</label>
          <input type="text" className={inputClass} placeholder="Ola" value={data.firstName} onChange={(e) => updateContact({ firstName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Etternavn *</label>
          <input type="text" className={inputClass} placeholder="Nordmann" value={data.lastName} onChange={(e) => updateContact({ lastName: e.target.value })} />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-sm font-medium text-neutral-700">E-post *</label>
          <input type="email" className={inputClass} placeholder="ola.nordmann@epost.no" value={data.email} onChange={(e) => updateContact({ email: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Telefon</label>
          <input type="tel" className={inputClass} placeholder="+47 000 00 000" value={data.phone} onChange={(e) => updateContact({ phone: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Sted</label>
          <input type="text" className={inputClass} placeholder="Oslo, Norge" value={data.location} onChange={(e) => updateContact({ location: e.target.value })} />
          <p className="text-xs text-neutral-500 mt-1">Anbefalt: Kun By/Land.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">LinkedIn</label>
          <input type="url" className={inputClass} placeholder="https://linkedin.com/in/..." value={data.linkedin} onChange={(e) => updateContact({ linkedin: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Nettside / Portefølje</label>
          <input type="url" className={inputClass} placeholder="https://..." value={data.website} onChange={(e) => updateContact({ website: e.target.value })} />
        </div>

        <div className="space-y-1 col-span-2 mt-2 p-5 border rounded-2xl bg-white shadow-sm border-neutral-200">
          <div className="flex items-start justify-between">
            <div>
              <label className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                Bilde på CV <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] uppercase tracking-wider">Er valgfritt</span>
              </label>
              <p className="text-xs text-neutral-500 mt-1.5 max-w-sm leading-relaxed">
                Å bruke bilde varierer etter marked og stilling. Det anbefales ofte ikke for internasjonale roller pga. diskrimineringslovgivning.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input type="checkbox" className="sr-only peer" checked={data.includePhoto} onChange={(e) => updateContact({ includePhoto: e.target.checked })} />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          {data.includePhoto && (
            <div className="mt-5 pt-5 border-t border-neutral-100 flex flex-col gap-4">
              <div className="flex items-center gap-5">
                {data.photoUrl ? (
                  <div className="relative size-16 rounded-full overflow-hidden border-2 border-indigo-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={data.photoUrl} 
                      alt="Profil" 
                      className="w-full h-full object-cover" 
                      style={{ objectPosition: data.photoPosition || 'center' }} 
                    />
                  </div>
                ) : (
                  <div className="size-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs text-center border-2 border-dashed border-neutral-300 shrink-0">
                    Foto
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => updateContact({ photoUrl: reader.result as string, photoPosition: 'center' });
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-sm text-neutral-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full transition-colors"
                  />
                  {profileAvatar && profileAvatar !== data.photoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        updateContact({
                          photoUrl: profileAvatar,
                          photoPosition: "center",
                        })
                      }
                      className="text-xs text-[#c15a3a] hover:text-[#14110e]"
                    >
                      Bruk profilbildet
                    </button>
                  )}
                </div>
              </div>

              {data.photoUrl && (
                <div className="flex items-center gap-3 pl-[84px]">
                  <span className="text-xs font-medium text-neutral-500">Bildesentrering:</span>
                  <div className="flex bg-neutral-100 rounded-lg p-1">
                    {['top', 'center', 'bottom'].map((pos) => (
                      <button
                        key={pos}
                        onClick={(e) => { e.preventDefault(); updateContact({ photoPosition: pos }); }}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          (data.photoPosition || 'center') === pos 
                            ? 'bg-white text-indigo-700 shadow-sm' 
                            : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                      >
                        {pos === 'top' ? 'Topp' : pos === 'bottom' ? 'Bunn' : 'Senter'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/10 text-[12px] hover:border-black/30 transition-colors max-w-[220px]"
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
            className="absolute top-full mt-2 left-0 w-64 rounded-2xl border border-black/8 bg-white overflow-hidden z-20"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className={`group flex items-center gap-1 px-3 py-2 text-[12px] transition-colors ${
                    r.id === activeResumeId
                      ? "bg-[#eee9df] text-[#14110e]"
                      : "hover:bg-[#eee9df]/50 text-[#14110e]/70"
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
                        className="flex-1 min-w-0 px-2 py-1 rounded-md border border-[#c15a3a] text-[12px] outline-none"
                      />
                      <button
                        type="submit"
                        className="p-0.5 text-[#c15a3a]"
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
                          className="p-1 hover:text-[#c15a3a]"
                          title="Gi nytt navn"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => duplicateResume(r.id)}
                          className="p-1 hover:text-[#c15a3a]"
                          title="Dupliser"
                        >
                          <Copy className="size-3" />
                        </button>
                        {resumes.length > 1 && (
                          <button
                            onClick={() => removeResume(r.id)}
                            className="p-1 hover:text-[#c15a3a]"
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
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#c15a3a] hover:bg-[#c15a3a]/5 border-t border-black/8 transition-colors"
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
