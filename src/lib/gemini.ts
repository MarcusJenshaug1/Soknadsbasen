/**
 * Thin wrapper around Google's Gemini API. Runs server-side only —
 * never expose the API key to the browser.
 */

const MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const STREAM_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

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

  const MAX_ATTEMPTS = 4;
  let res!: Response;
  let lastErr = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": key,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    lastErr = await res.text();
    // Retry only on transient overload/rate-limit
    if (res.status !== 503 && res.status !== 429) break;
    if (attempt === MAX_ATTEMPTS - 1) break;
    const delay = 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, delay));
  }

  if (!res.ok) {
    if (res.status === 503) {
      throw new Error(
        "AI-tjenesten er overbelastet akkurat nå. Prøv igjen om et minutt.",
      );
    }
    throw new Error(`Gemini ${res.status}: ${lastErr.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Tomt svar fra Gemini");
  return text;
}

/**
 * Streaming variant — returns a ReadableStream<string> of text chunks.
 * Uses Gemini's SSE endpoint. Callers must be server-side.
 */
export async function geminiStream(
  userPrompt: string,
  opts: GeminiOptions = {},
): Promise<ReadableStream<string>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY ikke satt");

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: opts.maxOutputTokens ?? 2048,
  };

  const requestBody: {
    contents: GeminiContent[];
    systemInstruction?: GeminiContent;
    generationConfig?: Record<string, unknown>;
  } = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig,
  };
  if (opts.system) {
    requestBody.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(STREAM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": key,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 503) {
      throw new Error("AI-tjenesten er overbelastet akkurat nå. Prøv igjen om et minutt.");
    }
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const upstream = res.body!;
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload) as {
                candidates?: { content?: { parts?: { text?: string }[] } }[];
              };
              const chunk = evt.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) controller.enqueue(chunk);
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
