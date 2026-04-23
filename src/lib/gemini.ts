/**
 * Thin wrapper around Google's Gemini API. Runs server-side only —
 * never expose the API key to the browser.
 */

const MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type GeminiPart = { text: string };
type GeminiContent = { role?: "user" | "model"; parts: GeminiPart[] };

export type GeminiOptions = {
  system?: string;
  /** 0–2, default 0.7 */
  temperature?: number;
  /** Max output tokens, default 2048 */
  maxOutputTokens?: number;
  /** Force structured JSON output — Gemini 2.0+ feature */
  json?: boolean;
};

export async function geminiGenerate(
  userPrompt: string,
  opts: GeminiOptions = {},
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY ikke satt");

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: opts.maxOutputTokens ?? 2048,
  };
  if (opts.json) generationConfig.responseMimeType = "application/json";

  const body: {
    contents: GeminiContent[];
    systemInstruction?: GeminiContent;
    generationConfig?: Record<string, unknown>;
  } = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig,
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Tomt svar fra Gemini");
  return text;
}
