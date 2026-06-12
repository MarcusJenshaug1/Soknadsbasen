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
// 429/5xx automatisk. Lazy: konstruktøren kaster uten ANTHROPIC_API_KEY, som
// ikke finnes under `next build` — utsett til første kall (runtime).
let clientSingleton: Anthropic | null = null;
function getClient(): Anthropic {
  if (!clientSingleton) clientSingleton = new Anthropic({ maxRetries: 4 });
  return clientSingleton;
}

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
  /**
   * Structured output: API-en garanterer gyldig JSON som matcher skjemaet
   * (output_config.format). Sterkere enn `json` (som bare nudger via prompt) —
   * bruk for ekstraksjon der enum-verdier må holde. Husk
   * `additionalProperties: false` på alle objekter; min/max-constraints
   * støttes ikke av API-et.
   */
  jsonSchema?: Record<string, unknown>;
  /**
   * Kalles med token-forbruk og faktisk modell når svaret er komplett
   * (claudeGenerate: synkront etter kallet; claudeStream: etter siste
   * chunk). Opt-in — brukes til AiUsageEvent-kostnadsloggen. model kommer
   * fra API-responsen, så ANTHROPIC_MODEL-override logges riktig. Feil i
   * callbacken svelges.
   */
  onUsage?: (usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  }) => void;
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
    message = await getClient().messages.create({
      model: resolveModel(opts),
      max_tokens: opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
      system: buildSystem(opts),
      messages: [{ role: "user", content: userPrompt }],
      ...(opts.jsonSchema
        ? {
            output_config: {
              format: {
                type: "json_schema" as const,
                schema: opts.jsonSchema,
              },
            },
          }
        : {}),
    });
  } catch (err) {
    throw toFriendlyError(err);
  }

  if (opts.onUsage) {
    try {
      opts.onUsage({
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: message.model,
      });
    } catch (err) {
      console.error("claudeGenerate onUsage-callback feilet:", err);
    }
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
 *
 * Første stream-event awaites FØR ReadableStream konstrueres, så pre-stream-
 * feil (auth, 529-overload, ugyldig modell) kaster fra selve kallet — det er
 * dét som lar AI-rutene refundere kvote-credits når Claude er nede. Feil
 * midt i streamen går fortsatt via controller.error.
 */
export async function claudeStream(
  userPrompt: string,
  opts: ClaudeOptions = {},
): Promise<ReadableStream<string>> {
  const stream = getClient().messages.stream({
    model: resolveModel(opts),
    max_tokens: opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
    system: buildSystem(opts),
    messages: [{ role: "user", content: userPrompt }],
  });

  const iterator = stream[Symbol.asyncIterator]();
  let first: IteratorResult<Anthropic.MessageStreamEvent>;
  try {
    first = await iterator.next();
  } catch (err) {
    throw toFriendlyError(err);
  }

  return new ReadableStream<string>({
    async start(controller) {
      let emittedText = false;
      try {
        let cursor = first;
        while (!cursor.done) {
          const event = cursor.value;
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
          cursor = await iterator.next();
        }
        // Samme invariant som claudeGenerate: et «vellykket» svar uten tekst er
        // en feil — ellers shipper konsumentene tomt innhold som suksess.
        if (!emittedText) {
          controller.error(new Error("Tomt svar fra Claude. Prøv igjen."));
          return;
        }
        if (opts.onUsage) {
          try {
            const final = await stream.finalMessage();
            opts.onUsage({
              inputTokens: final.usage.input_tokens,
              outputTokens: final.usage.output_tokens,
              model: final.model,
            });
          } catch (err) {
            console.error("claudeStream onUsage-callback feilet:", err);
          }
        }
        controller.close();
      } catch (err) {
        controller.error(toFriendlyError(err));
      }
    },
  });
}
