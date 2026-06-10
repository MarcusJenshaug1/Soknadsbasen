// VENDORED fra src/store/useResumeStore.ts — kun type-definisjoner (ingen
// runtime-avhengigheter). Hold i sync med kilden ved CV-skjemaendringer.
// Collab-serveren deployes selvstendig og kan ikke importere fra Next-appen.

export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Language {
  id: string;
  name: string;
  level: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  role: string;
  url: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Course {
  id: string;
  name: string;
  institution: string;
  date: string;
  description: string;
}

export interface Volunteering {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export interface Publication {
  id: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
  description: string;
}

export interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
}

/* ─── Section ordering & visibility ───────────────────────── */

export type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "certifications"
  | "projects"
  | "courses"
  | "volunteering"
  | "awards"
  | "publications"
  | "references"
  | "interests";

export const SECTION_LABELS: Record<SectionKey, { no: string; en: string }> = {
  summary: { no: "Profil", en: "Profile" },
  experience: { no: "Erfaring", en: "Experience" },
  education: { no: "Utdanning", en: "Education" },
  skills: { no: "Ferdigheter", en: "Skills" },
  languages: { no: "Språk", en: "Languages" },
  certifications: { no: "Sertifiseringer", en: "Certifications" },
  projects: { no: "Prosjekter", en: "Projects" },
  courses: { no: "Kurs", en: "Courses" },
  volunteering: { no: "Frivillig arbeid", en: "Volunteering" },
  awards: { no: "Priser og utmerkelser", en: "Awards" },
  publications: { no: "Publikasjoner", en: "Publications" },
  references: { no: "Referanser", en: "References" },
  interests: { no: "Interesser", en: "Interests" },
};

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "certifications",
  "projects",
  "courses",
  "volunteering",
  "awards",
  "publications",
  "references",
  "interests",
];

/* ─── Main resume data shape ──────────────────────────────── */

export interface ResumeData {
  id?: string;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    photoUrl?: string;
    includePhoto?: boolean;
    photoPosition?: string;
  };
  role: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  languages: Language[];
  certifications: Certification[];
  projects: Project[];
  courses: Course[];
  volunteering: Volunteering[];
  awards: Award[];
  publications: Publication[];
  references: Reference[];
  interests: string[];

  /* Layout & design */
  templateId: string;
  colorPalette: string;
  fontPair: string;
  locale: "no" | "en";
  sectionOrder: SectionKey[];
  sectionVisibility: Record<SectionKey, boolean>;
  showSectionIcons: boolean;
  datePosition: "left" | "right";
}

/* ─── Multi-CV metadata ───────────────────────────────────── */

export interface ResumeEntry {
  id: string;
  name: string;
  createdAt: string;
}
