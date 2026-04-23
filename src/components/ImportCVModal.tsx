"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  Link2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import type { ParsedCV } from "@/lib/cv-parser";

/* ─── Types ───────────────────────────────────────────────── */

interface ImportCVModalProps {
  open: boolean;
  onClose: () => void;
}

type ImportStep = "upload" | "parsing" | "preview" | "error";

/* ═══════════════════════════════════════════════════════════ */
/* ─── Modal Component ─────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════ */

export function ImportCVModal({ open, onClose }: ImportCVModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsed, setParsed] = useState<ParsedCV | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateContact = useResumeStore((s) => s.updateContact);
  const updateRole = useResumeStore((s) => s.updateRole);
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const updateSkills = useResumeStore((s) => s.updateSkills);

  /* ── Upload & parse ────────────────────────────────────── */

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Bare PDF-filer er støttet.");
      setStep("error");
      return;
    }

    setFileName(file.name);
    setStep("parsing");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/cv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Noe gikk galt.");
        setStep("error");
        return;
      }

      setParsed(data.data as ParsedCV);
      setStep("preview");
    } catch {
      setError("Nettverksfeil. Prøv igjen.");
      setStep("error");
    }
  }, []);

  /* ── Apply parsed data to store ────────────────────────── */

  const applyToStore = useCallback(() => {
    if (!parsed) return;

    const store = useResumeStore.getState();
    const { contact, role, summary, skills, experience, education, languages, references, certifications } = parsed;

    // Contact
    updateContact({
      firstName: contact.firstName || store.data.contact.firstName,
      lastName: contact.lastName || store.data.contact.lastName,
      email: contact.email || store.data.contact.email,
      phone: contact.phone || store.data.contact.phone,
      location: contact.location || store.data.contact.location,
      linkedin: contact.linkedin || store.data.contact.linkedin,
      website: contact.website || store.data.contact.website,
    });

    // Role & summary
    if (role) updateRole(role);
    if (summary) updateSummary(summary);

    // Skills
    if (skills.length > 0) {
      const existing = store.data.skills;
      const merged = [...new Set([...existing, ...skills])];
      updateSkills(merged);
    }

    // Experience — use setState for array fields
    if (experience.length > 0) {
      useResumeStore.setState((s) => ({
        data: {
          ...s.data,
          experience: experience.length > 0 ? experience : s.data.experience,
        },
      }));
    }

    // Education
    if (education.length > 0) {
      useResumeStore.setState((s) => ({
        data: {
          ...s.data,
          education: education.length > 0 ? education : s.data.education,
        },
      }));
    }

    // Languages
    if (languages.length > 0) {
      useResumeStore.setState((s) => ({
        data: {
          ...s.data,
          languages: languages.length > 0 ? languages : s.data.languages,
        },
      }));
    }

    // References
    if (references.length > 0) {
      useResumeStore.setState((s) => ({
        data: {
          ...s.data,
          references: references.length > 0 ? references : s.data.references,
          sectionVisibility: { ...s.data.sectionVisibility, references: true },
        },
      }));
    }

    // Certifications
    if (certifications.length > 0) {
      useResumeStore.setState((s) => ({
        data: {
          ...s.data,
          certifications: certifications.length > 0 ? certifications : s.data.certifications,
          sectionVisibility: { ...s.data.sectionVisibility, certifications: true },
        },
      }));
    }

    onClose();
    // Reset state for next time
    setStep("upload");
    setParsed(null);
    setFileName("");
  }, [parsed, updateContact, updateRole, updateSummary, updateSkills, onClose]);

  /* ── Drag & drop ───────────────────────────────────────── */

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* ── Reset ─────────────────────────────────────────────── */

  const reset = () => {
    setStep("upload");
    setParsed(null);
    setError("");
    setFileName("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
            <Upload className="size-5 text-indigo-600" />
            Importer CV
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 transition-colors">
            <X className="size-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "upload" && (
            <UploadStep
              dragOver={dragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileSelect={handleFile}
              fileInputRef={fileInputRef}
            />
          )}
          {step === "parsing" && <ParsingStep fileName={fileName} />}
          {step === "preview" && parsed && <PreviewStep parsed={parsed} />}
          {step === "error" && <ErrorStep error={error} onRetry={reset} />}
        </div>

        {/* Footer */}
        {step === "preview" && parsed && (
          <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Last opp en annen
            </button>
            <button
              onClick={applyToStore}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-colors"
            >
              Bruk denne CVen
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* ─── Sub-components ──────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════ */

function UploadStep({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  fileInputRef,
}: {
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600">
        Last opp en eksisterende CV eller en LinkedIn-profil eksportert som PDF. Vi leser innholdet og fyller ut feltene automatisk.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          dragOver
            ? "border-indigo-500 bg-indigo-50"
            : "border-neutral-300 hover:border-indigo-400 hover:bg-neutral-50"
        }`}
      >
        <Upload className={`size-10 mx-auto mb-3 ${dragOver ? "text-indigo-600" : "text-neutral-400"}`} />
        <p className="text-sm font-medium text-neutral-700">
          Dra og slipp PDF-filen her
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          eller klikk for å velge en fil
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
        />
      </div>

      {/* Supported format */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
          <FileText className="size-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-neutral-800">PDF-CV</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Standard CV i PDF-format. Mest vanlige formater støttes.
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
          <Link2 className="size-5 text-[#0a66c2] shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-neutral-800">LinkedIn PDF</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Eksporter profilen din fra LinkedIn som PDF og last opp her.
            </div>
          </div>
        </div>
      </div>

      {/* LinkedIn instructions */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          <Link2 className="size-4" />
          Hvordan eksportere fra LinkedIn?
        </summary>
        <div className="mt-3 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 space-y-2">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Gå til din LinkedIn-profil</li>
            <li>Klikk &quot;Mer&quot; (knappen ved siden av profilbildet)</li>
            <li>Velg &quot;Lagre som PDF&quot;</li>
            <li>Last opp den nedlastede PDFen her</li>
          </ol>
        </div>
      </details>
    </div>
  );
}

function ParsingStep({ fileName }: { fileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="size-10 text-indigo-600 animate-spin mb-4" />
      <p className="text-sm font-medium text-neutral-700">Leser og analyserer CVen...</p>
      <p className="text-xs text-neutral-400 mt-1">{fileName}</p>
    </div>
  );
}

function ErrorStep({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="size-10 text-red-500 mb-4" />
      <p className="text-sm font-medium text-neutral-800">Importfeil</p>
      <p className="text-xs text-red-600 mt-1 max-w-sm">{error}</p>
      <button
        onClick={onRetry}
        className="mt-6 px-5 py-2 text-sm font-medium bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
      >
        Prøv igjen
      </button>
    </div>
  );
}

/* ─── Preview of parsed data ──────────────────────────────── */

function PreviewStep({ parsed }: { parsed: ParsedCV }) {
  const sourceLabel = parsed.source === "linkedin" ? "LinkedIn-profil" : "CV";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-5 text-green-600" />
        <span className="font-medium text-green-700">
          Fant data fra {sourceLabel}
        </span>
      </div>

      {/* Contact */}
      {(parsed.contact.firstName || parsed.contact.email) && (
        <SectionPreview title="Kontaktinfo">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-600">
            {parsed.contact.firstName && (
              <div><span className="font-medium">Navn:</span> {parsed.contact.firstName} {parsed.contact.lastName}</div>
            )}
            {parsed.contact.email && (
              <div><span className="font-medium">E-post:</span> {parsed.contact.email}</div>
            )}
            {parsed.contact.phone && (
              <div><span className="font-medium">Telefon:</span> {parsed.contact.phone}</div>
            )}
            {parsed.contact.location && (
              <div><span className="font-medium">Sted:</span> {parsed.contact.location}</div>
            )}
            {parsed.contact.linkedin && (
              <div className="col-span-2 truncate"><span className="font-medium">LinkedIn:</span> {parsed.contact.linkedin}</div>
            )}
          </div>
        </SectionPreview>
      )}

      {/* Role */}
      {parsed.role && (
        <SectionPreview title="Rolle">
          <p className="text-xs text-neutral-600">{parsed.role}</p>
        </SectionPreview>
      )}

      {/* Summary */}
      {parsed.summary && (
        <SectionPreview title="Profil">
          <p className="text-xs text-neutral-600 line-clamp-3">{parsed.summary}</p>
        </SectionPreview>
      )}

      {/* Experience */}
      {parsed.experience.length > 0 && (
        <SectionPreview title={`Erfaring (${parsed.experience.length})`}>
          <div className="space-y-3">
            {parsed.experience.map((exp) => (
              <div key={exp.id} className="border-l-2 border-indigo-200 pl-3 py-0.5">
                <div className="text-xs font-semibold text-neutral-800">
                  {exp.title || "Ukjent tittel"}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {exp.company && <span>{exp.company}</span>}
                  {exp.location && <span> · {exp.location}</span>}
                  <span className="ml-2">{exp.startDate} — {exp.current ? "Nå" : exp.endDate}</span>
                </div>
                {exp.description && (
                  <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </SectionPreview>
      )}

      {/* Education */}
      {parsed.education.length > 0 && (
        <SectionPreview title={`Utdanning (${parsed.education.length})`}>
          <div className="space-y-3">
            {parsed.education.map((edu) => (
              <div key={edu.id} className="border-l-2 border-emerald-200 pl-3 py-0.5">
                <div className="text-xs font-semibold text-neutral-800">
                  {edu.degree || edu.field || "Ukjent"}
                  {edu.field && edu.degree && <span className="font-normal text-neutral-500"> — {edu.field}</span>}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {edu.school && <span>{edu.school}</span>}
                  {edu.location && <span> · {edu.location}</span>}
                  {(edu.startDate || edu.endDate) && (
                    <span className="ml-2">{edu.startDate} — {edu.endDate}</span>
                  )}
                </div>
                {edu.description && (
                  <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">{edu.description}</p>
                )}
              </div>
            ))}
          </div>
        </SectionPreview>
      )}

      {/* Skills */}
      {parsed.skills.length > 0 && (
        <SectionPreview title={`Ferdigheter (${parsed.skills.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {parsed.skills.map((skill, i) => (
              <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </SectionPreview>
      )}

      {/* Languages */}
      {parsed.languages.length > 0 && (
        <SectionPreview title="Språk">
          <div className="flex gap-3">
            {parsed.languages.map((lang) => (
              <span key={lang.id} className="text-xs text-neutral-600">
                {lang.name} <span className="text-neutral-400">({lang.level})</span>
              </span>
            ))}
          </div>
        </SectionPreview>
      )}

      {/* References */}
      {parsed.references.length > 0 && (
        <SectionPreview title={`Referanser (${parsed.references.length})`}>
          <div className="space-y-1">
            {parsed.references.map((ref) => (
              <div key={ref.id} className="text-xs text-neutral-600">
                <span className="font-medium">{ref.name}</span>
                {ref.title && <span className="text-neutral-400"> — {ref.title}</span>}
              </div>
            ))}
          </div>
        </SectionPreview>
      )}
    </div>
  );
}

function SectionPreview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}
