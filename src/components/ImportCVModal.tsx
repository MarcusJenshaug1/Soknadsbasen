"use client";

import { useCallback, useRef, useState } from "react";
import { useResumeStore, type Experience, type Education, type Language, type Certification, type Project } from "@/store/useResumeStore";
import { IconClose, IconArrowRight, IconCheck } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

type Step = "upload" | "parsing" | "preview" | "error";

type ParsedContact = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
}>;

type ParsedExperience = Partial<{
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}>;

type ParsedEducation = Partial<{
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}>;

type ParsedLanguage = Partial<{ name: string; level: string }>;
type ParsedCertification = Partial<{ name: string; issuer: string; date: string; url: string }>;
type ParsedProject = Partial<{ name: string; role: string; description: string; url: string }>;

type Parsed = {
  contact?: ParsedContact;
  role?: string;
  summary?: string;
  experience?: ParsedExperience[];
  education?: ParsedEducation[];
  skills?: string[];
  languages?: ParsedLanguage[];
  certifications?: ParsedCertification[];
  projects?: ParsedProject[];
  interests?: string[];
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function ImportCVModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Bare PDF-filer støttes.");
      setStep("error");
      return;
    }
    setFileName(file.name);
    setError("");
    setStep("parsing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/parse-cv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt.");
        setStep("error");
        return;
      }
      setParsed(data.data as Parsed);
      setStep("preview");
    } catch {
      setError("Nettverksfeil. Prøv igjen.");
      setStep("error");
    }
  }, []);

  const reset = () => {
    setStep("upload");
    setParsed(null);
    setError("");
    setFileName("");
  };

  const applyToStore = useCallback(() => {
    if (!parsed) return;
    const store = useResumeStore.getState();

    if (parsed.contact) {
      store.updateContact({
        firstName: parsed.contact.firstName || store.data.contact.firstName,
        lastName: parsed.contact.lastName || store.data.contact.lastName,
        email: parsed.contact.email || store.data.contact.email,
        phone: parsed.contact.phone || store.data.contact.phone,
        location: parsed.contact.location || store.data.contact.location,
        linkedin: parsed.contact.linkedin || store.data.contact.linkedin,
        website: parsed.contact.website || store.data.contact.website,
      });
    }
    if (parsed.role) store.updateRole(parsed.role);
    if (parsed.summary) store.updateSummary(parsed.summary);
    if (parsed.skills?.length) {
      const merged = Array.from(
        new Set([...store.data.skills, ...parsed.skills.filter(Boolean)]),
      );
      store.updateSkills(merged);
    }

    useResumeStore.setState((s) => {
      const next = { ...s.data };
      if (parsed.experience?.length) {
        next.experience = parsed.experience.map<Experience>((e) => ({
          id: uid(),
          title: e.title ?? "",
          company: e.company ?? "",
          location: e.location ?? "",
          startDate: e.startDate ?? "",
          endDate: e.endDate ?? "",
          current: !!e.current,
          description: e.description ?? "",
        }));
      }
      if (parsed.education?.length) {
        next.education = parsed.education.map<Education>((e) => ({
          id: uid(),
          school: e.school ?? "",
          degree: e.degree ?? "",
          field: e.field ?? "",
          location: e.location ?? "",
          startDate: e.startDate ?? "",
          endDate: e.endDate ?? "",
          current: !!e.current,
          description: e.description ?? "",
        }));
      }
      if (parsed.languages?.length) {
        next.languages = parsed.languages.map<Language>((l) => ({
          id: uid(),
          name: l.name ?? "",
          level: l.level ?? "",
        }));
      }
      if (parsed.certifications?.length) {
        next.certifications = parsed.certifications.map<Certification>((c) => ({
          id: uid(),
          name: c.name ?? "",
          issuer: c.issuer ?? "",
          date: c.date ?? "",
          url: c.url ?? "",
        }));
      }
      if (parsed.projects?.length) {
        next.projects = parsed.projects.map<Project>((p) => ({
          id: uid(),
          name: p.name ?? "",
          role: p.role ?? "",
          url: p.url ?? "",
          startDate: "",
          endDate: "",
          current: false,
          description: p.description ?? "",
        }));
      }
      if (parsed.interests?.length) {
        next.interests = parsed.interests;
      }
      return { data: next };
    });

    onClose();
    reset();
  }, [parsed, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#14110e]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#faf8f5] rounded-3xl w-full max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col border border-black/8">
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/8">
          <div>
            <SectionLabel>Importer CV</SectionLabel>
            <h2 className="text-[20px] font-medium tracking-tight mt-1">
              {step === "preview" ? "Vi fant følgende" : "Last opp CV"}
            </h2>
          </div>
          <button
            onClick={() => {
              onClose();
              reset();
            }}
            className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60"
            aria-label="Lukk"
          >
            <IconClose size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "upload" && (
            <UploadStep
              dragOver={dragOver}
              setDragOver={setDragOver}
              onFile={handleFile}
              inputRef={inputRef}
            />
          )}
          {step === "parsing" && <ParsingStep fileName={fileName} />}
          {step === "preview" && parsed && <PreviewStep parsed={parsed} />}
          {step === "error" && <ErrorStep message={error} onRetry={reset} />}
        </div>

        {step === "preview" && parsed && (
          <footer className="px-6 py-4 border-t border-black/8 flex items-center justify-between gap-3 bg-[#eee9df]/50">
            <button
              onClick={reset}
              className="text-[12px] text-[#14110e]/60 hover:text-[#14110e]"
            >
              Prøv en annen fil
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  reset();
                }}
                className="px-4 py-2 rounded-full text-[12px] border border-black/15 hover:border-black/30"
              >
                Avbryt
              </button>
              <button
                onClick={applyToStore}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] text-[12px] font-medium hover:bg-[#a94424]"
              >
                Bruk denne CVen
                <IconArrowRight size={14} />
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

function UploadStep({
  dragOver,
  setDragOver,
  onFile,
  inputRef,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onFile: (f: File) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-5">
      <p className="text-[13px] text-[#14110e]/65 leading-relaxed">
        Last opp en eksisterende CV eller en LinkedIn-profil eksportert som PDF.
        AI leser innholdet og fyller ut feltene. Vi legger aldri til informasjon
        som ikke står i kilden — alt kan redigeres manuelt etterpå.
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver
            ? "border-[#D5592E] bg-[#D5592E]/5"
            : "border-black/15 hover:border-black/40 bg-white",
        )}
      >
        <div className="size-10 mx-auto mb-3 rounded-full bg-[#eee9df] flex items-center justify-center">
          <IconArrowRight
            size={18}
            className="rotate-[-90deg] text-[#14110e]/70"
          />
        </div>
        <p className="text-[14px] font-medium">Dra og slipp PDF her</p>
        <p className="text-[12px] text-[#14110e]/55 mt-1">
          eller klikk for å velge en fil
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Tile
          title="PDF-CV"
          desc="Vanlige CV-formater leses inn."
        />
        <Tile
          title="LinkedIn PDF"
          desc="Profil → mer → lagre som PDF → last opp."
        />
      </div>
    </div>
  );
}

function Tile({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-black/5">
      <div className="text-[13px] font-medium">{title}</div>
      <div className="text-[11px] text-[#14110e]/55 mt-1">{desc}</div>
    </div>
  );
}

function ParsingStep({ fileName }: { fileName: string }) {
  return (
    <div className="py-14 text-center">
      <div className="inline-flex size-10 rounded-full border-2 border-[#D5592E] border-t-transparent animate-spin mb-5" />
      <div className="text-[15px] font-medium">Leser {fileName} …</div>
      <p className="text-[12px] text-[#14110e]/55 mt-2">
        AI ekstraherer strukturerte felter. Tar vanligvis 10-20 sekunder.
      </p>
    </div>
  );
}

function PreviewStep({ parsed }: { parsed: Parsed }) {
  const rows: { label: string; value: string | null }[] = [
    {
      label: "Navn",
      value:
        [parsed.contact?.firstName, parsed.contact?.lastName]
          .filter(Boolean)
          .join(" ") || null,
    },
    { label: "E-post", value: parsed.contact?.email || null },
    { label: "Telefon", value: parsed.contact?.phone || null },
    { label: "Sted", value: parsed.contact?.location || null },
    { label: "Ønsket rolle", value: parsed.role || null },
    { label: "Profil", value: parsed.summary ? `${parsed.summary.slice(0, 80)}…` : null },
    {
      label: "Erfaring",
      value: parsed.experience?.length
        ? `${parsed.experience.length} stillinger`
        : null,
    },
    {
      label: "Utdanning",
      value: parsed.education?.length
        ? `${parsed.education.length} oppføringer`
        : null,
    },
    {
      label: "Ferdigheter",
      value: parsed.skills?.length ? parsed.skills.slice(0, 5).join(", ") + (parsed.skills.length > 5 ? ` +${parsed.skills.length - 5}` : "") : null,
    },
    {
      label: "Språk",
      value: parsed.languages?.length
        ? parsed.languages.map((l) => l.name).filter(Boolean).join(", ")
        : null,
    },
    {
      label: "Sertifiseringer",
      value: parsed.certifications?.length
        ? `${parsed.certifications.length}`
        : null,
    },
    {
      label: "Prosjekter",
      value: parsed.projects?.length ? `${parsed.projects.length}` : null,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#14110e]/65">
        Sjekk over at dette stemmer. Vi erstatter eksisterende CV-innhold når du
        klikker &quot;Bruk denne CVen&quot;.
      </p>
      <ul className="divide-y divide-black/5 bg-white rounded-2xl border border-black/5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#14110e]/55 shrink-0 min-w-[110px]">
              {r.label}
            </span>
            <span
              className={cn(
                "text-[13px] text-right flex-1 min-w-0",
                r.value ? "text-[#14110e]" : "text-[#14110e]/30 italic",
              )}
            >
              {r.value ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconCheck size={12} className="text-[#16a34a]" />
                  {r.value}
                </span>
              ) : (
                "ikke funnet"
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorStep({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-10 text-center">
      <div className="inline-flex size-10 rounded-full bg-[#D5592E]/10 text-[#D5592E] items-center justify-center mb-4">
        <IconClose size={20} />
      </div>
      <div className="text-[15px] font-medium mb-2">Import mislyktes</div>
      <p className="text-[12px] text-[#14110e]/65 max-w-sm mx-auto mb-6">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] text-[12px] font-medium hover:bg-[#a94424]"
      >
        Prøv igjen
      </button>
    </div>
  );
}
