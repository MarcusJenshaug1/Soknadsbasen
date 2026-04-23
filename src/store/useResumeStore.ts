import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ─── Section item types ───────────────────────────────────── */

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

/* ─── Store interface ─────────────────────────────────────── */

interface ResumeStore {
  /* Multi-CV management */
  resumes: ResumeEntry[];
  activeResumeId: string;
  _resumeDataMap: Record<string, ResumeData>;

  /* Active resume data (backward compat — all existing code reads this) */
  data: ResumeData;

  /* Multi-CV actions */
  addResume: (name?: string) => void;
  removeResume: (id: string) => void;
  setActiveResume: (id: string) => void;
  renameResume: (id: string, name: string) => void;
  duplicateResume: (id: string) => void;

  updateContact: (patch: Partial<ResumeData["contact"]>) => void;
  updateRole: (role: string) => void;
  updateSummary: (summary: string) => void;
  updateSkills: (skills: string[]) => void;
  updateInterests: (interests: string[]) => void;

  addExperience: () => void;
  updateExperience: (id: string, patch: Partial<Experience>) => void;
  removeExperience: (id: string) => void;

  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<Education>) => void;
  removeEducation: (id: string) => void;

  addLanguage: () => void;
  updateLanguage: (id: string, patch: Partial<Language>) => void;
  removeLanguage: (id: string) => void;

  addCertification: () => void;
  updateCertification: (id: string, patch: Partial<Certification>) => void;
  removeCertification: (id: string) => void;

  addProject: () => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;

  addCourse: () => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  removeCourse: (id: string) => void;

  addVolunteering: () => void;
  updateVolunteering: (id: string, patch: Partial<Volunteering>) => void;
  removeVolunteering: (id: string) => void;

  addAward: () => void;
  updateAward: (id: string, patch: Partial<Award>) => void;
  removeAward: (id: string) => void;

  addPublication: () => void;
  updatePublication: (id: string, patch: Partial<Publication>) => void;
  removePublication: (id: string) => void;

  addReference: () => void;
  updateReference: (id: string, patch: Partial<Reference>) => void;
  removeReference: (id: string) => void;

  setTemplate: (id: string) => void;
  setColorPalette: (id: string) => void;
  setFontPair: (id: string) => void;
  setLocale: (locale: "no" | "en") => void;
  setSectionOrder: (order: SectionKey[]) => void;
  toggleSectionVisibility: (key: SectionKey) => void;
  setShowSectionIcons: (show: boolean) => void;
  setDatePosition: (pos: "left" | "right") => void;
  replaceData: (data: ResumeData) => void;

  isSaving: boolean;
}

/* ─── Defaults ────────────────────────────────────────────── */

const defaultVisibility: Record<SectionKey, boolean> = {
  summary: true,
  experience: true,
  education: true,
  skills: true,
  languages: true,
  certifications: false,
  projects: false,
  courses: false,
  volunteering: false,
  awards: false,
  publications: false,
  references: false,
  interests: false,
};

const defaultData: ResumeData = {
  contact: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
    photoUrl: "",
    includePhoto: false,
  },
  role: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  languages: [
    { id: "lang-1", name: "Norsk", level: "Morsmål" },
    { id: "lang-2", name: "Engelsk", level: "Flytende" },
  ],
  certifications: [],
  projects: [],
  courses: [],
  volunteering: [],
  awards: [],
  publications: [],
  references: [],
  interests: [],
  templateId: "modern-professional",
  colorPalette: "indigo",
  fontPair: "inter-merriweather",
  locale: "no",
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  sectionVisibility: { ...defaultVisibility },
  showSectionIcons: true,
  datePosition: "right",
};

function uid() {
  return Math.random().toString(36).substring(2, 9);
}

function addItem<T extends { id: string }>(list: T[], factory: () => T): T[] {
  return [...list, factory()];
}
function updateItem<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
function removeItem<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id);
}

/* ─── Store (localStorage, multi-CV) ──────────────────────── */

const INITIAL_RESUME_ID = "resume-default";

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      /* Multi-CV state */
      resumes: [{ id: INITIAL_RESUME_ID, name: "Min CV", createdAt: new Date().toISOString() }],
      activeResumeId: INITIAL_RESUME_ID,
      _resumeDataMap: { [INITIAL_RESUME_ID]: { ...defaultData } },

      data: defaultData,
      isSaving: false,

      /* ── Multi-CV actions ───────────────────────────── */

      addResume: (name) => {
        const id = `resume-${uid()}`;
        const now = new Date().toISOString();
        const newData = { ...defaultData };
        set((s) => ({
          resumes: [...s.resumes, { id, name: name ?? `CV ${s.resumes.length + 1}`, createdAt: now }],
          _resumeDataMap: { ...s._resumeDataMap, [s.activeResumeId]: s.data, [id]: newData },
          activeResumeId: id,
          data: newData,
        }));
      },

      removeResume: (id) => {
        const s = get();
        if (s.resumes.length <= 1) return;
        const remaining = s.resumes.filter((r) => r.id !== id);
        const newActive = id === s.activeResumeId ? remaining[0].id : s.activeResumeId;
        const newMap = { ...s._resumeDataMap };
        delete newMap[id];
        // Save current data into map before switching
        if (id !== s.activeResumeId) newMap[s.activeResumeId] = s.data;
        set({
          resumes: remaining,
          activeResumeId: newActive,
          _resumeDataMap: newMap,
          data: newMap[newActive] ?? defaultData,
        });
      },

      setActiveResume: (id) => {
        const s = get();
        if (id === s.activeResumeId) return;
        // Save current data into map, load new
        const newMap = { ...s._resumeDataMap, [s.activeResumeId]: s.data };
        set({
          activeResumeId: id,
          _resumeDataMap: newMap,
          data: newMap[id] ?? defaultData,
        });
      },

      renameResume: (id, name) =>
        set((s) => ({
          resumes: s.resumes.map((r) => (r.id === id ? { ...r, name } : r)),
        })),

      duplicateResume: (id) => {
        const s = get();
        const srcData = id === s.activeResumeId ? s.data : (s._resumeDataMap[id] ?? defaultData);
        const srcMeta = s.resumes.find((r) => r.id === id);
        const newId = `resume-${uid()}`;
        const now = new Date().toISOString();
        set({
          resumes: [...s.resumes, { id: newId, name: `${srcMeta?.name ?? "CV"} (kopi)`, createdAt: now }],
          _resumeDataMap: { ...s._resumeDataMap, [s.activeResumeId]: s.data, [newId]: { ...srcData } },
          activeResumeId: newId,
          data: { ...srcData },
        });
      },

      /* ── Existing data actions (unchanged) ──────────── */

      updateContact: (patch) =>
        set((s) => ({ data: { ...s.data, contact: { ...s.data.contact, ...patch } } })),
      updateRole: (role) => set((s) => ({ data: { ...s.data, role } })),
      updateSummary: (summary) => set((s) => ({ data: { ...s.data, summary } })),
      updateSkills: (skills) => set((s) => ({ data: { ...s.data, skills } })),
      updateInterests: (interests) => set((s) => ({ data: { ...s.data, interests } })),

      addExperience: () =>
        set((s) => ({
          data: { ...s.data, experience: addItem(s.data.experience, () => ({ id: uid(), company: "", title: "", location: "", startDate: "", endDate: "", current: false, description: "" })) },
        })),
      updateExperience: (id, patch) =>
        set((s) => ({ data: { ...s.data, experience: updateItem(s.data.experience, id, patch) } })),
      removeExperience: (id) =>
        set((s) => ({ data: { ...s.data, experience: removeItem(s.data.experience, id) } })),

      addEducation: () =>
        set((s) => ({
          data: { ...s.data, education: addItem(s.data.education, () => ({ id: uid(), school: "", degree: "", field: "", location: "", startDate: "", endDate: "", current: false, description: "" })) },
        })),
      updateEducation: (id, patch) =>
        set((s) => ({ data: { ...s.data, education: updateItem(s.data.education, id, patch) } })),
      removeEducation: (id) =>
        set((s) => ({ data: { ...s.data, education: removeItem(s.data.education, id) } })),

      addLanguage: () =>
        set((s) => ({
          data: { ...s.data, languages: addItem(s.data.languages, () => ({ id: uid(), name: "", level: "Grunnleggende" })) },
        })),
      updateLanguage: (id, patch) =>
        set((s) => ({ data: { ...s.data, languages: updateItem(s.data.languages, id, patch) } })),
      removeLanguage: (id) =>
        set((s) => ({ data: { ...s.data, languages: removeItem(s.data.languages, id) } })),

      addCertification: () =>
        set((s) => ({
          data: { ...s.data, certifications: addItem(s.data.certifications, () => ({ id: uid(), name: "", issuer: "", date: "", url: "" })) },
        })),
      updateCertification: (id, patch) =>
        set((s) => ({ data: { ...s.data, certifications: updateItem(s.data.certifications, id, patch) } })),
      removeCertification: (id) =>
        set((s) => ({ data: { ...s.data, certifications: removeItem(s.data.certifications, id) } })),

      addProject: () =>
        set((s) => ({
          data: { ...s.data, projects: addItem(s.data.projects, () => ({ id: uid(), name: "", role: "", url: "", startDate: "", endDate: "", current: false, description: "" })) },
        })),
      updateProject: (id, patch) =>
        set((s) => ({ data: { ...s.data, projects: updateItem(s.data.projects, id, patch) } })),
      removeProject: (id) =>
        set((s) => ({ data: { ...s.data, projects: removeItem(s.data.projects, id) } })),

      addCourse: () =>
        set((s) => ({
          data: { ...s.data, courses: addItem(s.data.courses, () => ({ id: uid(), name: "", institution: "", date: "", description: "" })) },
        })),
      updateCourse: (id, patch) =>
        set((s) => ({ data: { ...s.data, courses: updateItem(s.data.courses, id, patch) } })),
      removeCourse: (id) =>
        set((s) => ({ data: { ...s.data, courses: removeItem(s.data.courses, id) } })),

      addVolunteering: () =>
        set((s) => ({
          data: { ...s.data, volunteering: addItem(s.data.volunteering, () => ({ id: uid(), organization: "", role: "", startDate: "", endDate: "", current: false, description: "" })) },
        })),
      updateVolunteering: (id, patch) =>
        set((s) => ({ data: { ...s.data, volunteering: updateItem(s.data.volunteering, id, patch) } })),
      removeVolunteering: (id) =>
        set((s) => ({ data: { ...s.data, volunteering: removeItem(s.data.volunteering, id) } })),

      addAward: () =>
        set((s) => ({
          data: { ...s.data, awards: addItem(s.data.awards, () => ({ id: uid(), title: "", issuer: "", date: "", description: "" })) },
        })),
      updateAward: (id, patch) =>
        set((s) => ({ data: { ...s.data, awards: updateItem(s.data.awards, id, patch) } })),
      removeAward: (id) =>
        set((s) => ({ data: { ...s.data, awards: removeItem(s.data.awards, id) } })),

      addPublication: () =>
        set((s) => ({
          data: { ...s.data, publications: addItem(s.data.publications, () => ({ id: uid(), title: "", publisher: "", date: "", url: "", description: "" })) },
        })),
      updatePublication: (id, patch) =>
        set((s) => ({ data: { ...s.data, publications: updateItem(s.data.publications, id, patch) } })),
      removePublication: (id) =>
        set((s) => ({ data: { ...s.data, publications: removeItem(s.data.publications, id) } })),

      addReference: () =>
        set((s) => ({
          data: { ...s.data, references: addItem(s.data.references, () => ({ id: uid(), name: "", title: "", company: "", email: "", phone: "", relationship: "" })) },
        })),
      updateReference: (id, patch) =>
        set((s) => ({ data: { ...s.data, references: updateItem(s.data.references, id, patch) } })),
      removeReference: (id) =>
        set((s) => ({ data: { ...s.data, references: removeItem(s.data.references, id) } })),

      setTemplate: (id) => set((s) => ({ data: { ...s.data, templateId: id } })),
      setColorPalette: (id) => set((s) => ({ data: { ...s.data, colorPalette: id } })),
      setFontPair: (id) => set((s) => ({ data: { ...s.data, fontPair: id } })),
      setLocale: (locale) => set((s) => ({ data: { ...s.data, locale } })),
      setSectionOrder: (order) => set((s) => ({ data: { ...s.data, sectionOrder: order } })),
      toggleSectionVisibility: (key) =>
        set((s) => ({
          data: { ...s.data, sectionVisibility: { ...s.data.sectionVisibility, [key]: !s.data.sectionVisibility[key] } },
        })),
      setShowSectionIcons: (show) => set((s) => ({ data: { ...s.data, showSectionIcons: show } })),
      setDatePosition: (pos) => set((s) => ({ data: { ...s.data, datePosition: pos } })),
      replaceData: (data) => set(() => ({ data })),
    }),
    {
      name: "cv-maker-storage",
      version: 2,
      partialize: (state) => ({
        resumes: state.resumes,
        activeResumeId: state.activeResumeId,
        _resumeDataMap: { ...state._resumeDataMap, [state.activeResumeId]: state.data },
        data: state.data,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          // v1 → v2: wrap single `data` into multi-CV structure
          const existingData = state.data as ResumeData | undefined;
          const id = INITIAL_RESUME_ID;
          state.resumes = [{ id, name: "Min CV", createdAt: new Date().toISOString() }];
          state.activeResumeId = id;
          state._resumeDataMap = { [id]: existingData ?? defaultData };
          // data stays as-is
        }
        return state;
      },
      merge: (persisted, current) => {
        const p = persisted as {
          resumes?: ResumeEntry[];
          activeResumeId?: string;
          _resumeDataMap?: Record<string, ResumeData>;
          data?: Partial<ResumeData>;
        } | undefined;
        if (!p) return current;

        const resumes = p.resumes ?? current.resumes;
        const activeResumeId = p.activeResumeId ?? current.activeResumeId;
        const resumeDataMap = p._resumeDataMap ?? current._resumeDataMap;

        // Resolve active data from map or persisted data
        const activeData = resumeDataMap[activeResumeId] ?? p.data ?? current.data;

        return {
          ...current,
          resumes,
          activeResumeId,
          _resumeDataMap: resumeDataMap,
          data: {
            ...current.data,
            ...activeData,
            contact: {
              ...current.data.contact,
              ...(activeData.contact ?? {}),
            },
            sectionOrder: activeData.sectionOrder ?? current.data.sectionOrder,
            sectionVisibility: {
              ...current.data.sectionVisibility,
              ...(activeData.sectionVisibility ?? {}),
            },
          },
        };
      },
    }
  )
);
