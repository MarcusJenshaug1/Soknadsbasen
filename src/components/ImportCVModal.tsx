"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, ListChecks, Wand2 } from "lucide-react";
import { useResumeStore, type Experience, type Education, type Language, type Certification, type Project } from "@/store/useResumeStore";
import { IconClose, IconArrowRight, IconCheck } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/Pill";
import { Modal } from "@/components/ui/Modal";
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

      // Importerte seksjoner som certifications/projects/interests er skjult i
      // defaultVisibility. Uten dette lagres dataen, men forsvinner sporløst fra
      // CV-en og eksporten. Slå på synlighet + sørg for plass i rekkefølgen for
      // alt vi faktisk fylte.
      const populated = [
        parsed.experience?.length && "experience",
        parsed.education?.length && "education",
        parsed.languages?.length && "languages",
        parsed.certifications?.length && "certifications",
        parsed.projects?.length && "projects",
        parsed.interests?.length && "interests",
      ].filter(Boolean) as (keyof typeof next.sectionVisibility)[];

      if (populated.length) {
        next.sectionVisibility = { ...next.sectionVisibility };
        next.sectionOrder = [...next.sectionOrder];
        for (const key of populated) {
          next.sectionVisibility[key] = true;
          if (!next.sectionOrder.includes(key)) next.sectionOrder.push(key);
        }
      }

      return { data: next };
    });

    onClose();
    reset();
  }, [parsed, onClose]);

  const handleClose = () => {
    onClose();
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      ariaLabel="Importer CV"
      panelClassName="bg-bg rounded-3xl w-full max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col border border-black/8 dark:border-white/8"
    >
      <header className="flex items-center justify-between px-6 py-4 border-b border-black/8 dark:border-white/8">
        <div>
          <SectionLabel>Importer CV</SectionLabel>
          <h2 className="text-[20px] font-medium tracking-tight mt-1">
            {step === "preview" ? "Vi fant følgende" : "Last opp CV"}
          </h2>
        </div>
        <button
          onClick={handleClose}
          className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-ink/60"
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
        <footer className="px-6 py-4 border-t border-black/8 dark:border-white/8 flex items-center justify-between gap-3 bg-panel/50">
          <button
            onClick={reset}
            className="text-[12px] text-ink/60 hover:text-ink"
          >
            Prøv en annen fil
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-full text-[12px] border border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30"
            >
              Avbryt
            </button>
            <button
              onClick={applyToStore}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-accent-hover"
            >
              Bruk denne CVen
              <IconArrowRight size={14} />
            </button>
          </div>
        </footer>
      )}
    </Modal>
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
      <p className="text-[13px] text-ink/65 leading-relaxed">
        Last opp en eksisterende CV eller en LinkedIn-profil eksportert som PDF.
        AI leser innholdet og fyller ut feltene. Vi legger aldri til informasjon
        som ikke står i kilden, og alt kan redigeres manuelt etterpå.
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
            ? "border-accent bg-accent/5"
            : "border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40 bg-surface",
        )}
      >
        <div className="size-10 mx-auto mb-3 rounded-full bg-panel flex items-center justify-center">
          <IconArrowRight size={18} className="rotate-[-90deg] text-ink/70" />
        </div>
        <p className="text-[14px] font-medium">Dra og slipp PDF her</p>
        <p className="text-[12px] text-ink/55 mt-1">
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
        <Tile title="PDF-CV" desc="Vanlige CV-formater leses inn." />
        <Tile title="LinkedIn PDF" desc="Profil → mer → lagre som PDF → last opp." />
      </div>
    </div>
  );
}

function Tile({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 rounded-2xl bg-surface border border-black/5 dark:border-white/5">
      <div className="text-[13px] font-medium">{title}</div>
      <div className="text-[11px] text-ink/55 mt-1">{desc}</div>
    </div>
  );
}

const PARSE_STAGES = [
  { id: "read", label: "Leser PDF-en", Icon: FileText },
  { id: "ai", label: "AI-en leser gjennom", Icon: Sparkles },
  { id: "structure", label: "Strukturerer feltene", Icon: ListChecks },
  { id: "polish", label: "Pusser på detaljene", Icon: Wand2 },
];

// Varm, selvbevisst humor om PROSESSEN/AI-en — aldri om brukeren.
const PARSE_QUIPS = [
  "AI-en tar på seg lesebrillene.",
  "Må innrømme det, fin erfaring du har her.",
  "Teller kommaene så du slipper.",
  "Vi finner aldri på noe, bare det som faktisk står der.",
  "Sorterer årene dine pent i bokser.",
  "Henter fram det viktigste, lar resten ligge.",
  "En god CV fortjener en grundig lesning.",
  "Lover å ikke dømme skriftvalget ditt.",
];

function ParsingStep({ fileName }: { fileName: string }) {
  const [stage, setStage] = useState(0);
  const [quip, setQuip] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setStage((s) => Math.min(s + 1, PARSE_STAGES.length - 1)),
      3200,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setQuip((q) => (q + 1) % PARSE_QUIPS.length),
      2700,
    );
    return () => clearInterval(t);
  }, []);

  // Holder seg under 100 % til serveren faktisk svarer (da byttes hele steget ut).
  const pct = Math.min(94, 16 + stage * 26);
  const StageIcon = PARSE_STAGES[stage].Icon;

  return (
    <div className="py-6">
      <div className="flex flex-col items-center text-center mb-7">
        <motion.div
          className="size-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={stage}
              initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 12 }}
              transition={{ duration: 0.35 }}
              className="text-accent"
            >
              <StageIcon size={26} />
            </motion.span>
          </AnimatePresence>
        </motion.div>
        <div className="text-[15px] font-medium truncate max-w-[280px]">
          {fileName}
        </div>
        <p className="text-[12px] text-ink/55 mt-1">
          Vanligvis 10 til 20 sekunder. Ingenting blir funnet på.
        </p>
      </div>

      <div className="h-1.5 bg-panel rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full bg-accent rounded-full"
          initial={{ width: "8%" }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: "easeOut", duration: 0.7 }}
        />
      </div>

      <ul className="space-y-2.5 mb-6">
        {PARSE_STAGES.map((s, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={s.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "size-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  done && "bg-success text-bg",
                  active && "bg-accent text-bg",
                  !done && !active && "bg-panel text-ink/30",
                )}
              >
                {done ? (
                  <IconCheck size={12} />
                ) : active ? (
                  <motion.span
                    className="size-2 rounded-full bg-bg"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={cn(
                  "text-[13px] transition-colors",
                  done || active ? "text-ink" : "text-ink/40",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="h-5 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={quip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="text-[12px] text-ink/50 italic"
          >
            {PARSE_QUIPS[quip]}
          </motion.p>
        </AnimatePresence>
      </div>
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
      <p className="text-[12px] text-ink/65">
        Sjekk over at dette stemmer. Vi erstatter eksisterende CV-innhold når du
        klikker &quot;Bruk denne CVen&quot;.
      </p>
      <ul className="divide-y divide-black/5 dark:divide-white/5 bg-surface rounded-2xl border border-black/5 dark:border-white/5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink/55 shrink-0 min-w-[110px]">
              {r.label}
            </span>
            <span
              className={cn(
                "text-[13px] text-right flex-1 min-w-0",
                r.value ? "text-ink" : "text-ink/30 italic",
              )}
            >
              {r.value ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconCheck size={12} className="text-success" />
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
      <div className="inline-flex size-10 rounded-full bg-accent/10 text-accent items-center justify-center mb-4">
        <IconClose size={20} />
      </div>
      <div className="text-[15px] font-medium mb-2">Import mislyktes</div>
      <p className="text-[12px] text-ink/65 max-w-sm mx-auto mb-6">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-accent-hover"
      >
        Prøv igjen
      </button>
    </div>
  );
}
