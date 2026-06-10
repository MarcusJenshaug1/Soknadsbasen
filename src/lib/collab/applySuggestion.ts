/**
 * Anvender et godkjent collab-forslag på eierens lagrede CV-JSON.
 *
 * resumeData er en V2-wrapper: { data, activeResumeId, _resumeDataMap, resumes }.
 * Den AKTIVE CV-en finnes både i `_resumeDataMap[activeResumeId]` og i `data`
 * (klienten holder dem i synk), så vi anvender på begge representasjonene.
 *
 * fieldPath er en punktsti inn i ResumeData, f.eks. "summary", "role" eller
 * "experience.2.description" (samme konvensjon som CollabSuggestion.fieldPath).
 */
export function applySuggestionToResume(
  raw: string,
  fieldPath: string,
  afterValue: unknown,
): string | null {
  let outer: unknown;
  try {
    outer = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!outer || typeof outer !== "object") return null;
  const wrapper = outer as Record<string, unknown>;

  const activeId =
    typeof wrapper.activeResumeId === "string" ? wrapper.activeResumeId : null;

  const targets: Record<string, unknown>[] = [];
  const map = wrapper._resumeDataMap;
  if (map && typeof map === "object" && activeId) {
    const entry = (map as Record<string, unknown>)[activeId];
    if (entry && typeof entry === "object") targets.push(entry as Record<string, unknown>);
  }
  if (wrapper.data && typeof wrapper.data === "object") {
    const d = wrapper.data as Record<string, unknown>;
    if (!targets.includes(d)) targets.push(d);
  }
  // Legacy: rå ResumeData uten wrapper.
  if (!targets.length) targets.push(wrapper);

  let applied = false;
  for (const t of targets) {
    if (setByPath(t, fieldPath, afterValue)) applied = true;
  }
  if (!applied) return null;

  return JSON.stringify(wrapper);
}

function setByPath(
  root: Record<string, unknown>,
  path: string,
  value: unknown,
): boolean {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return false;

  let cur: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = stepInto(cur, parts[i]);
    if (cur === undefined) return false;
  }
  const last = parts[parts.length - 1];

  if (Array.isArray(cur)) {
    const idx = Number(last);
    if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return false;
    cur[idx] = value;
    return true;
  }
  if (cur && typeof cur === "object") {
    (cur as Record<string, unknown>)[last] = value;
    return true;
  }
  return false;
}

function stepInto(cur: unknown, key: string): unknown {
  if (Array.isArray(cur)) {
    const idx = Number(key);
    if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return undefined;
    return cur[idx];
  }
  if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
    return (cur as Record<string, unknown>)[key];
  }
  return undefined;
}
