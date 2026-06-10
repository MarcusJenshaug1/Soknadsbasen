// VENDORED fra src/lib/yjs/mapper.ts — hold i sync med kilden. Collab-serveren
// deployes selvstendig (egen node_modules/yjs) og kan ikke importere fra appen.
/**
 * Bidirectional bridge between the flat `ResumePayloadV2` JSON shape and a
 * Yjs Y.Doc. Used both client-side (in useYjsSync) and server-side (in
 * Hocuspocus onStoreDocument) so they MUST stay in sync.
 *
 * Document layout:
 *   ydoc.getMap("meta")          Y.Map
 *     .activeResumeId            string
 *     .resumes                   Y.Array<Y.Map>   { id, name, createdAt }
 *
 *   ydoc.getMap("active")        Y.Map            — flat keys for the ACTIVE CV
 *     .role                      Y.Text
 *     .summary                   Y.Text
 *     .templateId                string
 *     .colorPalette              string
 *     .fontPair                  string
 *     .locale                    string
 *     .showSectionIcons          boolean
 *     .datePosition              string
 *     .contact                   Y.Map<string|boolean>
 *     .experience                Y.Array<Y.Map>
 *     .education                 Y.Array<Y.Map>
 *     .languages                 Y.Array<Y.Map>
 *     .certifications            Y.Array<Y.Map>
 *     .projects                  Y.Array<Y.Map>
 *     .courses                   Y.Array<Y.Map>
 *     .volunteering              Y.Array<Y.Map>
 *     .awards                    Y.Array<Y.Map>
 *     .publications              Y.Array<Y.Map>
 *     .references                Y.Array<Y.Map>
 *     .skills                    Y.Array<string>
 *     .interests                 Y.Array<string>
 *     .sectionOrder              Y.Array<string>
 *     .sectionVisibility         Y.Map<boolean>
 *
 *   ydoc.getMap("dataMap")       Y.Map<string, JSON-snapshot>
 *     Inactive CVs that aren't being collaboratively edited. Stored as
 *     plain JSON inside Y.Map for last-writer-wins; switching active CV
 *     copies into/out of `active`.
 *
 * Design notes:
 *  - Y.Text on long-form text fields (role, summary, item descriptions)
 *    gives character-level merge for concurrent edits.
 *  - Y.Array<Y.Map> on lists gives concurrent insert/reorder/delete.
 *  - `meta.resumes` is a Y.Array so renaming/adding/removing CVs merges
 *    correctly.
 *  - Inactive CVs are LWW because we don't expect concurrent edits on
 *    them. Only `active` gets full CRDT treatment.
 */

import * as Y from "yjs";
import type {
  Award,
  Certification,
  Course,
  Education,
  Experience,
  Language,
  Project,
  Publication,
  Reference,
  ResumeData,
  ResumeEntry,
  Volunteering,
} from "./resume-types.js";

/* ─── Public types (mirrors ResumePayloadV2 in useCloudSync) ──── */

export interface ResumePayloadV2 {
  resumes: ResumeEntry[];
  activeResumeId: string;
  _resumeDataMap: Record<string, ResumeData>;
  data: ResumeData;
}

/* ─── Helpers for Y.Map ↔ POJO ──────────────────────────────── */

const TEXT_KEYS_ROOT = ["role", "summary"] as const;

const TEXT_KEYS_BY_LIST: Record<string, readonly string[]> = {
  experience: ["description"],
  education: ["description"],
  projects: ["description"],
  courses: ["description"],
  volunteering: ["description"],
  awards: ["description"],
  publications: ["description"],
};

function ensureYText(map: Y.Map<unknown>, key: string, value: string) {
  const existing = map.get(key);
  if (existing instanceof Y.Text) {
    if (existing.toString() !== value) {
      existing.delete(0, existing.length);
      if (value) existing.insert(0, value);
    }
    return;
  }
  const next = new Y.Text();
  if (value) next.insert(0, value);
  map.set(key, next);
}

function yTextToString(value: unknown): string {
  if (value instanceof Y.Text) return value.toString();
  if (typeof value === "string") return value;
  return "";
}

function setStringArray(yarr: Y.Array<string>, values: string[]) {
  if (yarr.length > 0) yarr.delete(0, yarr.length);
  if (values.length > 0) yarr.insert(0, values);
}

function yArrayToStringArray(yarr: Y.Array<string>): string[] {
  return yarr.toArray();
}

function setListWithIds<T extends { id: string }>(
  yarr: Y.Array<Y.Map<unknown>>,
  items: T[],
  textKeys: readonly string[],
) {
  // Bygg en map fra id → eksisterende Y.Map for å beholde Y.Text-identiteter
  // (slik at concurrent karakter-merge fortsetter å fungere).
  const existing = new Map<string, Y.Map<unknown>>();
  for (let i = 0; i < yarr.length; i++) {
    const m = yarr.get(i);
    const id = m.get("id");
    if (typeof id === "string") existing.set(id, m);
  }

  // Tøm og rebuild i ny rekkefølge — Y.Array kan ikke reorderes effektivt
  // uten å delete+insert. Vi bevarer Y.Map-identiteter for items vi
  // kjenner igjen ved id.
  if (yarr.length > 0) yarr.delete(0, yarr.length);

  const fresh: Y.Map<unknown>[] = [];
  for (const item of items) {
    const reused = existing.get(item.id);
    const map = reused ?? new Y.Map();
    for (const [k, v] of Object.entries(item)) {
      if (textKeys.includes(k)) {
        ensureYText(map, k, typeof v === "string" ? v : "");
      } else {
        map.set(k, v);
      }
    }
    fresh.push(map);
  }
  if (fresh.length > 0) yarr.insert(0, fresh);
}

function listToObjects<T>(
  yarr: Y.Array<Y.Map<unknown>>,
  textKeys: readonly string[],
): T[] {
  const out: T[] = [];
  for (let i = 0; i < yarr.length; i++) {
    const m = yarr.get(i);
    const obj: Record<string, unknown> = {};
    for (const key of m.keys()) {
      const value = m.get(key);
      if (textKeys.includes(key)) {
        obj[key] = yTextToString(value);
      } else {
        obj[key] = value;
      }
    }
    out.push(obj as T);
  }
  return out;
}

/* ─── Apply JSON → Y.Doc (used on initial seed + active-CV switch) ─ */

export function applyResumeToYDoc(ydoc: Y.Doc, payload: ResumePayloadV2): void {
  ydoc.transact(() => {
    const meta = ydoc.getMap("meta");
    meta.set("activeResumeId", payload.activeResumeId);

    let resumesArr = meta.get("resumes");
    if (!(resumesArr instanceof Y.Array)) {
      resumesArr = new Y.Array<Y.Map<unknown>>();
      meta.set("resumes", resumesArr);
    }
    const ymetaArr = resumesArr as Y.Array<Y.Map<unknown>>;
    setListWithIds<ResumeEntry>(ymetaArr, payload.resumes, []);

    // Inactive CVs as plain JSON inside a Y.Map (LWW semantics).
    const dataMap = ydoc.getMap("dataMap");
    for (const id of Array.from(dataMap.keys())) {
      if (!(id in payload._resumeDataMap)) dataMap.delete(id);
    }
    for (const [id, data] of Object.entries(payload._resumeDataMap)) {
      if (id === payload.activeResumeId) continue;
      dataMap.set(id, data);
    }

    // Active CV gets full CRDT treatment.
    applyActiveToYMap(ydoc, payload.data);
  }, { source: "applyResumeToYDoc" });
}

function applyActiveToYMap(ydoc: Y.Doc, data: ResumeData): void {
  const active = ydoc.getMap("active");

  // Top-level text fields
  for (const key of TEXT_KEYS_ROOT) {
    ensureYText(active, key, data[key] ?? "");
  }

  // Plain scalar fields
  active.set("templateId", data.templateId);
  active.set("colorPalette", data.colorPalette);
  active.set("fontPair", data.fontPair);
  active.set("locale", data.locale);
  active.set("showSectionIcons", data.showSectionIcons);
  active.set("datePosition", data.datePosition);

  // Contact — Y.Map of primitives (string/boolean)
  let contactMap = active.get("contact");
  if (!(contactMap instanceof Y.Map)) {
    contactMap = new Y.Map();
    active.set("contact", contactMap);
  }
  const ycontact = contactMap as Y.Map<unknown>;
  for (const [k, v] of Object.entries(data.contact)) {
    ycontact.set(k, v);
  }
  for (const k of Array.from(ycontact.keys())) {
    if (!(k in data.contact)) ycontact.delete(k);
  }

  // Skills + interests — Y.Array<string>
  const skillsArr = ensureYArray<string>(active, "skills");
  setStringArray(skillsArr, data.skills);
  const interestsArr = ensureYArray<string>(active, "interests");
  setStringArray(interestsArr, data.interests);

  // Section order + visibility
  const orderArr = ensureYArray<string>(active, "sectionOrder");
  setStringArray(orderArr, data.sectionOrder);

  let visMap = active.get("sectionVisibility");
  if (!(visMap instanceof Y.Map)) {
    visMap = new Y.Map();
    active.set("sectionVisibility", visMap);
  }
  const yvis = visMap as Y.Map<unknown>;
  for (const [k, v] of Object.entries(data.sectionVisibility)) {
    yvis.set(k, v);
  }

  // Item lists — preserve Y.Text identity per item via id.
  setListWithIds<Experience>(
    ensureYArray<Y.Map<unknown>>(active, "experience"),
    data.experience,
    TEXT_KEYS_BY_LIST.experience,
  );
  setListWithIds<Education>(
    ensureYArray<Y.Map<unknown>>(active, "education"),
    data.education,
    TEXT_KEYS_BY_LIST.education,
  );
  setListWithIds<Language>(
    ensureYArray<Y.Map<unknown>>(active, "languages"),
    data.languages,
    [],
  );
  setListWithIds<Certification>(
    ensureYArray<Y.Map<unknown>>(active, "certifications"),
    data.certifications,
    [],
  );
  setListWithIds<Project>(
    ensureYArray<Y.Map<unknown>>(active, "projects"),
    data.projects,
    TEXT_KEYS_BY_LIST.projects,
  );
  setListWithIds<Course>(
    ensureYArray<Y.Map<unknown>>(active, "courses"),
    data.courses,
    TEXT_KEYS_BY_LIST.courses,
  );
  setListWithIds<Volunteering>(
    ensureYArray<Y.Map<unknown>>(active, "volunteering"),
    data.volunteering,
    TEXT_KEYS_BY_LIST.volunteering,
  );
  setListWithIds<Award>(
    ensureYArray<Y.Map<unknown>>(active, "awards"),
    data.awards,
    TEXT_KEYS_BY_LIST.awards,
  );
  setListWithIds<Publication>(
    ensureYArray<Y.Map<unknown>>(active, "publications"),
    data.publications,
    TEXT_KEYS_BY_LIST.publications,
  );
  setListWithIds<Reference>(
    ensureYArray<Y.Map<unknown>>(active, "references"),
    data.references,
    [],
  );
}

function ensureYArray<T>(map: Y.Map<unknown>, key: string): Y.Array<T> {
  let arr = map.get(key);
  if (!(arr instanceof Y.Array)) {
    arr = new Y.Array<T>();
    map.set(key, arr);
  }
  return arr as Y.Array<T>;
}

/* ─── Project Y.Doc → JSON (for save snapshot + initial hydration) ─ */

export function yDocToResumePayload(ydoc: Y.Doc): ResumePayloadV2 {
  const meta = ydoc.getMap("meta");
  const activeId = (meta.get("activeResumeId") as string | undefined) ?? "";
  const resumesArr = meta.get("resumes");
  const resumes: ResumeEntry[] = [];
  if (resumesArr instanceof Y.Array) {
    for (let i = 0; i < resumesArr.length; i++) {
      const m = resumesArr.get(i) as Y.Map<unknown>;
      resumes.push({
        id: (m.get("id") as string) ?? "",
        name: (m.get("name") as string) ?? "",
        createdAt: (m.get("createdAt") as string) ?? "",
      });
    }
  }

  const activeData = readActiveFromYMap(ydoc);

  const dataMapNode = ydoc.getMap("dataMap");
  const dataMap: Record<string, ResumeData> = {};
  for (const id of dataMapNode.keys()) {
    const value = dataMapNode.get(id);
    if (value && typeof value === "object") {
      dataMap[id] = value as ResumeData;
    }
  }
  dataMap[activeId] = activeData;

  return {
    resumes,
    activeResumeId: activeId,
    _resumeDataMap: dataMap,
    data: activeData,
  };
}

function readActiveFromYMap(ydoc: Y.Doc): ResumeData {
  const active = ydoc.getMap("active");

  const contactMap = active.get("contact");
  const contact = contactMap instanceof Y.Map
    ? (Object.fromEntries(contactMap.entries()) as ResumeData["contact"])
    : ({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        website: "",
      } as ResumeData["contact"]);

  const skills = active.get("skills");
  const interests = active.get("interests");
  const sectionOrder = active.get("sectionOrder");
  const visMap = active.get("sectionVisibility");

  return {
    contact,
    role: yTextToString(active.get("role")),
    summary: yTextToString(active.get("summary")),
    experience: listToObjects<Experience>(
      ensureYArray<Y.Map<unknown>>(active, "experience"),
      TEXT_KEYS_BY_LIST.experience,
    ),
    education: listToObjects<Education>(
      ensureYArray<Y.Map<unknown>>(active, "education"),
      TEXT_KEYS_BY_LIST.education,
    ),
    skills: skills instanceof Y.Array ? yArrayToStringArray(skills) : [],
    languages: listToObjects<Language>(
      ensureYArray<Y.Map<unknown>>(active, "languages"),
      [],
    ),
    certifications: listToObjects<Certification>(
      ensureYArray<Y.Map<unknown>>(active, "certifications"),
      [],
    ),
    projects: listToObjects<Project>(
      ensureYArray<Y.Map<unknown>>(active, "projects"),
      TEXT_KEYS_BY_LIST.projects,
    ),
    courses: listToObjects<Course>(
      ensureYArray<Y.Map<unknown>>(active, "courses"),
      TEXT_KEYS_BY_LIST.courses,
    ),
    volunteering: listToObjects<Volunteering>(
      ensureYArray<Y.Map<unknown>>(active, "volunteering"),
      TEXT_KEYS_BY_LIST.volunteering,
    ),
    awards: listToObjects<Award>(
      ensureYArray<Y.Map<unknown>>(active, "awards"),
      TEXT_KEYS_BY_LIST.awards,
    ),
    publications: listToObjects<Publication>(
      ensureYArray<Y.Map<unknown>>(active, "publications"),
      TEXT_KEYS_BY_LIST.publications,
    ),
    references: listToObjects<Reference>(
      ensureYArray<Y.Map<unknown>>(active, "references"),
      [],
    ),
    interests: interests instanceof Y.Array ? yArrayToStringArray(interests) : [],
    templateId: (active.get("templateId") as string) ?? "modern-professional",
    colorPalette: (active.get("colorPalette") as string) ?? "indigo",
    fontPair: (active.get("fontPair") as string) ?? "inter-merriweather",
    locale: (active.get("locale") as ResumeData["locale"]) ?? "no",
    sectionOrder: sectionOrder instanceof Y.Array
      ? (yArrayToStringArray(sectionOrder) as ResumeData["sectionOrder"])
      : [],
    sectionVisibility: visMap instanceof Y.Map
      ? (Object.fromEntries(visMap.entries()) as ResumeData["sectionVisibility"])
      : ({} as ResumeData["sectionVisibility"]),
    showSectionIcons: (active.get("showSectionIcons") as boolean) ?? true,
    datePosition:
      (active.get("datePosition") as ResumeData["datePosition"]) ?? "right",
  };
}
