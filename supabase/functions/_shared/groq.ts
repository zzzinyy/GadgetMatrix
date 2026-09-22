/**
 * Reserva (fallback) vía Groq: proveedor gratuito que entra cuando Gemini
 * agota su cuota (HTTP 429 / RESOURCE_EXHAUSTED). Groq expone una API
 * compatible con OpenAI en https://api.groq.com/openai/v1/chat/completions.
 *
 * La clave se lee del secreto GROQ_API_KEY; sin ella la reserva queda
 * desactivada y se devuelve `ok:false` con un motivo claro.
 */

export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Modelo gratuito por defecto (rápido y con buena calidad en JSON). */
export const GROQ_MODEL = "llama-3.3-70b-versatile";

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

export async function callGroq(options: GroqOptions): Promise<GroqResult> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return { ok: false, text: "", error: "GROQ_API_KEY no configurada" };
  }
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
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
    return {
      ok: false,
      text: "",
      status: response.status,
      error: `Groq HTTP ${response.status}: ${detail}`,
    };
  }
  const data = (await response.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[] }
    | null;
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    return { ok: false, text: "", status: response.status, error: "Groq devolvió una respuesta vacía" };
  }
  return { ok: true, text, status: response.status };
}
