/**
 * Favoritos e historial reciente, guardados en localStorage (sin cuenta).
 * Lógica pura y testeable: el almacenamiento se inyecta para poder probar
 * sin depender del navegador.
 */

export const FAVORITES_KEY = "gadgetmatrix:favorites";
export const HISTORY_KEY = "gadgetmatrix:history";
const HISTORY_LIMIT = 20;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readList(storage: StorageLike | undefined, key: string): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeList(storage: StorageLike | undefined, key: string, value: string[]): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage lleno o bloqueado: se ignora sin romper la página.
  }
}

/** Favoritos: array de slugs de producto, sin duplicados. */
export function getFavorites(storage?: StorageLike): string[] {
  return readList(storage, FAVORITES_KEY);
}

export function isFavorite(slug: string, storage?: StorageLike): boolean {
  return getFavorites(storage).includes(slug);
}

/** Alterna el favorito y devuelve el nuevo estado. Sin almacenamiento no persiste. */
export function toggleFavorite(slug: string, storage?: StorageLike): boolean {
  const normalized = slug.trim();
  if (!normalized) return false;
  const current = getFavorites(storage);
  const next = current.includes(normalized)
    ? current.filter((item) => item !== normalized)
    : [...current, normalized];
  if (!storage) return next.includes(normalized);
  writeList(storage, FAVORITES_KEY, next);
  return getFavorites(storage).includes(normalized);
}

/**
 * Historial de fichas visitadas (slugs, el más reciente primero, sin
 * duplicados y limitado a 20). Se usa para "vistos recientemente".
 */
export function getHistory(storage?: StorageLike): string[] {
  return readList(storage, HISTORY_KEY);
}

export function pushHistory(slug: string, storage?: StorageLike): string[] {
  const normalized = slug.trim();
  if (!normalized) return getHistory(storage);
  const next = [normalized, ...getHistory(storage).filter((item) => item !== normalized)].slice(
    0,
    HISTORY_LIMIT,
  );
  writeList(storage, HISTORY_KEY, next);
  return next;
}

export function clearHistory(storage?: StorageLike): void {
  writeList(storage, HISTORY_KEY, []);
}

/** Acceso al localStorage solo en el navegador (seguro en prerender). */
export function browserStorage(): StorageLike | undefined {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // Acceso denegado (modo privado estricto, iframes…): se opera en memoria.
  }
  return undefined;
}
