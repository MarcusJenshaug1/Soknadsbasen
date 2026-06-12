import { useResumeStore } from "@/store/useResumeStore";

/**
 * Delt apply-/label-logikk for felt-nivå CV-forslag. Brukes av både
 * collab-innboksen (forslag fra inviterte hjelpere) og AI CV-hjelperen —
 * begge anvender godkjente forslag klient-side via de vanlige store-
 * actionene, så endringen propagerer gjennom aktiv sync-stack (Yjs/cloud).
 *
 * fieldPath-grammatikk: role | summary | skills | interests |
 * (experience|education).id:<id>.description
 */

export function asSuggestionString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((v) => asSuggestionString(v).trim()).filter(Boolean)
    : asSuggestionString(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
}

/**
 * Anvender en godkjent forslagsverdi i den levende CV-storen. Returnerer
 * false hvis feltet ikke lenger finnes, så kalleren unngår å markere et
 * forslag som godtatt uten effekt.
 */
export function applyResumeSuggestion(fieldPath: string, afterValue: unknown): boolean {
  const store = useResumeStore.getState();

  if (fieldPath === "role") {
    store.updateRole(asSuggestionString(afterValue));
    return true;
  }
  if (fieldPath === "summary") {
    store.updateSummary(asSuggestionString(afterValue));
    return true;
  }
  if (fieldPath === "skills") {
    store.updateSkills(toList(afterValue));
    return true;
  }
  if (fieldPath === "interests") {
    store.updateInterests(toList(afterValue));
    return true;
  }

  const m = fieldPath.match(/^(experience|education)\.id:([^.]+)\.description$/);
  if (m) {
    const [, section, id] = m;
    if (section === "experience") {
      if (!store.data.experience.some((e) => e.id === id)) return false;
      store.updateExperience(id, { description: asSuggestionString(afterValue) });
      return true;
    }
    if (!store.data.education.some((e) => e.id === id)) return false;
    store.updateEducation(id, { description: asSuggestionString(afterValue) });
    return true;
  }

  return false;
}

/** Oversetter en fieldPath til en menneskelig norsk label. */
export function labelForFieldPath(fieldPath: string): string {
  const direct: Record<string, string> = {
    role: "Ønsket rolle",
    summary: "Profil",
    skills: "Ferdigheter",
    interests: "Interesser",
  };
  if (fieldPath in direct) return direct[fieldPath];

  if (/^experience\.id:[^.]+\.description$/.test(fieldPath))
    return "Erfaring, beskrivelse";
  if (/^education\.id:[^.]+\.description$/.test(fieldPath))
    return "Utdanning, beskrivelse";

  return fieldPath;
}
