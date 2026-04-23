import { jsonrepair } from "jsonrepair";

/**
 * Parses JSON returned from an LLM. Strips markdown fences, slices between
 * first '{' and last '}', and falls back to jsonrepair for embedded
 * unescaped newlines / trailing commas / other common LLM quirks.
 */
export function parseLooseJson<T = unknown>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const startArr = cleaned.indexOf("[");
  const first =
    start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  const endObj = cleaned.lastIndexOf("}");
  const endArr = cleaned.lastIndexOf("]");
  const last = Math.max(endObj, endArr);
  const candidate =
    first !== -1 && last > first ? cleaned.slice(first, last + 1) : cleaned;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Gemini sometimes emits literal newlines inside strings etc.
    return JSON.parse(jsonrepair(candidate)) as T;
  }
}
