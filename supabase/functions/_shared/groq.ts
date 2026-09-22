/**
 * Reserva (fallback) vía Groq: proveedor gratuito que entra cuando Gemini
 * agota su cuota (HTTP 429 / RESOURCE_EXHAUSTED). Groq expone una API
 * compatible con OpenAI en https://api.groq.com/openai/v1/chat/completions.
 *
 * La clave se lee del secreto GROQ_API_KEY (o GROQ-API-KEY); sin ella la
 * reserva queda desactivada y se devuelve `ok:false` con un motivo claro.
 * Groq retira modelos periódicamente, así que se prueba una lista de
 * candidatos y el secreto opcional GROQ-MODEL permite fijar uno a mano.
 */

export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Catálogo candidato, del preferido al de reserva. */
export const GROQ_MODEL_CANDIDATES = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "llama-3.1-8b-instant",
  "moonshotai/kimi-k2-instruct",
  "qwen/qwen3-32b",
] as const;

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqOptions {
  apiKey: string | undefined;
  messages: GroqMessage[];
  /** Fuerza respuesta JSON (modo json_object); el esquema se pide en el system. */
  jsonMode?: boolean;
  temperature?: number;
  /** Modelo fijo (secreto GROQ-MODEL); si falla se cae al catálogo candidato. */
  fixedModel?: string;
}

export interface GroqResult {
  ok: boolean;
  text: string;
  error?: string;
  status?: number;
}

/** Detecta si un fallo de Gemini es por cuota agotada (→ usar la reserva). */
export function isQuotaError(error: unknown, status?: number): boolean {
  const text = String(error ?? "").toLowerCase();
  return (
    status === 429 ||
    status === 403 ||
    text.includes("resource_exhausted") ||
    text.includes("exceeded your current quota") ||
    text.includes("rate limit")
  );
}

/** Detecta "modelo retirado o sin acceso" para probar el siguiente candidato. */
function isModelNotFound(error: string, status?: number): boolean {
  return (
    status === 404 ||
    error.includes("model_not_found") ||
    error.includes("does not exist") ||
    error.includes("decommissioned")
  );
}

export async function callGroq(options: GroqOptions): Promise<GroqResult> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return { ok: false, text: "", error: "GROQ_API_KEY no configurada" };
  }

  const fixed = (options.fixedModel ?? "").trim();
  const candidates = fixed ? [fixed, ...GROQ_MODEL_CANDIDATES] : [...GROQ_MODEL_CANDIDATES];

  let lastError = "";
  for (const model of candidates) {
    const body: Record<string, unknown> = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
    };
    if (options.jsonMode) body.response_format = { type: "json_object" };

    let response: Response;
    try {
      response = await fetch(GROQ_CHAT_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      return { ok: false, text: "", error: `Groq inaccesible: ${String(error)}` };
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 400);
      lastError = `Groq HTTP ${response.status} (${model}): ${detail}`;
      if (isModelNotFound(detail, response.status)) continue;
      return { ok: false, text: "", status: response.status, error: lastError };
    }
    const data = (await response.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[] }
      | null;
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) {
      return {
        ok: false,
        text: "",
        status: response.status,
        error: `Groq devolvió una respuesta vacía (${model})`,
      };
    }
    return { ok: true, text, status: response.status };
  }
  return {
    ok: false,
    text: "",
    error: `Ningún modelo de Groq está disponible. Último intento: ${lastError}`,
  };
}
