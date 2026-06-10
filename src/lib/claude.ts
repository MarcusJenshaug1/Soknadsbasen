/**
 * Thin wrapper around the Anthropic Claude API. Runs server-side only —
 * never expose the API key to the browser.
 *
 * DATA-RESIDENS: Førsteparts Anthropic API (api.anthropic.com) prosesserer i
 * USA. Dette ble valgt bevisst (juni 2026) framfor Gemini, men oppfyller IKKE
 * EU-only-kravet for AI-kallene. Vil vi tilbake til EU-residens er Claude via
 * Amazon Bedrock (eu-central-1) eller Vertex AI (europe-*) en drop-in: bytt kun
 * klient-konstruksjonen under, modell-ID og funksjonene ellers er like.
 */

import Anthropic from "@anthropic-ai/sdk";

// Sonnet 4.6 dekker de generative behovene (søknadsbrev, profil, tips) til en
// brøkdel av Opus-prisen; de mekaniske ekstraksjons-rutene sender model:
// "claude-haiku-4-5" eksplisitt. ANTHROPIC_MODEL overstyrer alt globalt (nyttig
// som kostnads-bryter eller for testing).
const DEFAULT_MODEL = "claude-sonnet-4-6";
function resolveModel(opts: ClaudeOptions): string {
  return process.env.ANTHROPIC_MODEL ?? opts.model ?? DEFAULT_MODEL;
}
const DEFAULT_MAX_TOKENS = 2048;

// maxRetries: 4 speiler den gamle eksponentielle backoffen; SDK-en retrier
// 429/5xx automatisk.
const client = new Anthropic({ maxRetries: 4 });

export type ClaudeOptions = {
  /** Modell-ID. Default Sonnet 4.6; mekaniske ruter sender Haiku. */
  model?: string;
  system?: string;
  /**
   * Beholdt for kildekompatibilitet med de gamle Gemini-kallene. Opus 4.8
   * aksepterer ikke temperature (gir 400), så den ignoreres bevisst — styr
   * heller variasjon via prompten.
   */
  temperature?: number;
  /** Max output-tokens, default 2048. */
  maxOutputTokens?: number;
  /** Be modellen svare med ren JSON (ingen markdown-fences). */
  json?: boolean;
};

const JSON_NUDGE =
  "Svar med kun gyldig JSON. Ingen markdown-fences, ingen forklarende tekst rundt.";

function buildSystem(opts: ClaudeOptions): Anthropic.TextBlockParam[] | undefined {
  const parts = [opts.system, opts.json ? JSON_NUDGE : null].filter(
    (p): p is string => Boolean(p),
  );
  if (parts.length === 0) return undefined;
  // cache_control på systemblokken: gjentatte kall med samme (store) system-
  // prompt innen 5 min leses fra cache. Korte prefikser caches stille ikke.
  return [
    { type: "text", text: parts.join("\n\n"), cache_control: { type: "ephemeral" } },
  ];
}

function toFriendlyError(err: unknown): Error {
  if (err instanceof Anthropic.APIError && (err.status === 529 || err.status === 503)) {
    return new Error("AI-tjenesten er overbelastet akkurat nå. Prøv igjen om et minutt.");
  }
  if (err instanceof Anthropic.APIError) {
    return new Error(`Claude ${err.status}: ${err.message.slice(0, 200)}`);
  }
  return err instanceof Error ? err : new Error("AI-feil");
}

export async function claudeGenerate(
  userPrompt: string,
  opts: ClaudeOptions = {},
): Promise<string> {
  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: resolveModel(opts),
      max_tokens: opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
      system: buildSystem(opts),
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    throw toFriendlyError(err);
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("Tomt svar fra Claude. Prøv igjen.");
  return text;
}

/**
 * Streaming-variant — returnerer en ReadableStream<string> av tekst-chunks,
 * samme kontrakt som den gamle geminiStream. Kallere må være server-side.
 */
export async function claudeStream(
  userPrompt: string,
  opts: ClaudeOptions = {},
): Promise<ReadableStream<string>> {
  return new ReadableStream<string>({
    async start(controller) {
      let emittedText = false;
      try {
        const stream = client.messages.stream({
          model: resolveModel(opts),
          max_tokens: opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
          system: buildSystem(opts),
          messages: [{ role: "user", content: userPrompt }],
        });
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            if (chunk) {
              if (chunk.trim()) emittedText = true;
              controller.enqueue(chunk);
            }
          }
        }
        // Samme invariant som claudeGenerate: et «vellykket» svar uten tekst er
        // en feil — ellers shipper konsumentene tomt innhold som suksess.
        if (!emittedText) {
          controller.error(new Error("Tomt svar fra Claude. Prøv igjen."));
          return;
        }
        controller.close();
      } catch (err) {
        controller.error(toFriendlyError(err));
      }
    },
  });
}
