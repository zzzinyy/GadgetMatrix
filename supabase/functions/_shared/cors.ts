/**
 * CORS compartido por las Edge Functions.
 *
 * Antes se respondía siempre con `Access-Control-Allow-Origin: *`, así que
 * cualquier web podía llamar a las funciones desde el navegador de un
 * administrador con sesión abierta. Ahora el origen solo se refleja si está en
 * la lista blanca (`ALLOWED_ORIGINS`, separada por comas).
 */

/** Orígenes permitidos por defecto: la web publicada y el desarrollo local. */
export const DEFAULT_ALLOWED_ORIGINS = [
  "https://zzzinyy.github.io",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];

/** Cabeceras que el navegador puede enviar; el resto se rechaza en el preflight. */
export const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";

/** Convierte la variable de entorno en una lista de orígenes normalizados. */
export function parseAllowedOrigins(raw?: string | null): string[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

/** Normaliza un origen recibido para poder compararlo con la lista blanca. */
export function normalizeOrigin(origin?: string | null): string {
  return (origin ?? "").trim().replace(/\/+$/, "");
}

/** Lee la lista blanca del entorno, con los valores por defecto como respaldo. */
export function allowedOrigins(): string[] {
  const runtime = globalThis as {
    Deno?: { env?: { get?: (key: string) => string | undefined } };
  };
  return parseAllowedOrigins(runtime.Deno?.env?.get?.("ALLOWED_ORIGINS"));
}

/**
 * Cabeceras CORS para responder a `origin`. Si el origen no está permitido no se
 * emite `Access-Control-Allow-Origin`, así que el navegador bloquea la lectura.
 */
export function corsHeaders(
  origin?: string | null,
  allowed: readonly string[] = allowedOrigins(),
): Record<string, string> {
  const normalized = normalizeOrigin(origin);
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (normalized && allowed.includes(normalized)) {
    headers["Access-Control-Allow-Origin"] = normalized;
  }
  return headers;
}

/** Responde al preflight: 204 si el origen está permitido, 403 si no lo está. */
export function preflightResponse(
  origin?: string | null,
  allowed: readonly string[] = allowedOrigins(),
): Response {
  const headers = corsHeaders(origin, allowed);
  const permitted = Boolean(headers["Access-Control-Allow-Origin"]);
  return new Response(null, { status: permitted ? 204 : 403, headers });
}
