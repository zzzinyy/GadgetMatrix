/**
 * Muro antibot estilo Amazon: cuando una sesión navega a una velocidad
 * anómala (más de PV_LIMIT páginas en WINDOW_MS), se exige resolver un
 * reto de caracteres antes de seguir. Superado el reto, la sesión queda
 * verificada durante PASS_TTL_MS y no se vuelve a molestar.
 *
 * Nota honesta: la heurística vive en el cliente (no hay proxy/edge en el
 * stack actual), así que frena rastreadores ingenuos y abusos de la API
 * desde el navegador, no a un scraper con navegador real. Para blindarlo
 * de verdad haría falta un middleware en Supabase/edge con rate limiting.
 */

export const PV_KEY = "gadgetmatrix:botwall:pv";
export const PASS_KEY = "gadgetmatrix:botwall:passedAt";

/** Ventana de observación y límite de páginas vistas dentro de ella. */
export const WINDOW_MS = 60_000;
export const PV_LIMIT = 25;
/** Tiempo que dura la verificación tras resolver el reto. */
export const PASS_TTL_MS = 60 * 60 * 1000;

/** Caracteres sin ambigüedad (sin 0/O/1/I) para el reto visual. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readTimestamps(storage: StorageLike | undefined, key: string): number[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is number => typeof item === "number");
  } catch {
    return [];
  }
}

/** Registra una página vista y devuelve cuántas hay en la ventana actual. */
export function recordPageview(now = Date.now(), storage?: StorageLike): number {
  if (!storage) return 0;
  const recent = readTimestamps(storage, PV_KEY).filter((ts) => now - ts < WINDOW_MS);
  recent.push(now);
  try {
    storage.setItem(PV_KEY, JSON.stringify(recent.slice(-PV_LIMIT * 2)));
  } catch {
    // Almacenamiento lleno o bloqueado: el muro simplemente no se activa.
  }
  return recent.length;
}

/** True si la sesión resolvió el reto hace menos de PASS_TTL_MS. */
export function isVerified(now = Date.now(), storage?: StorageLike): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(PASS_KEY);
    const passedAt = raw ? Number(raw) : NaN;
    return Number.isFinite(passedAt) && now - passedAt < PASS_TTL_MS;
  } catch {
    return false;
  }
}

export function markVerified(now = Date.now(), storage?: StorageLike): void {
  if (!storage) return;
  try {
    storage.setItem(PASS_KEY, String(now));
    storage.removeItem(PV_KEY);
  } catch {
    // Sin persistencia, el muro reaparecerá si vuelve la ráfaga.
  }
}

/** True si toca enseñar el muro para esta navegación. */
export function shouldChallenge(now = Date.now(), storage?: StorageLike): boolean {
  if (isVerified(now, storage)) return false;
  return readTimestamps(storage, PV_KEY).filter((ts) => now - ts < WINDOW_MS).length >= PV_LIMIT;
}

/** Código aleatorio sin caracteres ambiguos. */
export function generateCode(length = CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** Comparación tolerante: mayúsculas, sin espacios. */
export function codeMatches(input: string, code: string): boolean {
  return input.replace(/\s+/g, "").toUpperCase() === code.toUpperCase();
}

/** Acceso seguro a sessionStorage (prerender y navegadores con storage denegado). */
export function sessionStorageLike(): StorageLike | undefined {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
  } catch {
    // Acceso denegado: se opera en memoria y el muro no llegará a activarse.
  }
  return undefined;
}