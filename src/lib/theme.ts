/**
 * Tema claro / oscuro. La web nació en oscuro; el tema claro es opt-in y se
 * recuerda en localStorage. Se aplica como clase `dark` en <html>, que es lo
 * que espera la variante `@custom-variant dark` de Tailwind.
 */

export const THEME_KEY = "gadgetmatrix:theme";
export type Theme = "dark" | "light";

export function getTheme(storage?: Pick<Storage, "getItem">): Theme {
  try {
    return storage?.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Aplica el tema al documento y lo recuerda. Idempotente y seguro en SSR. */
export function applyTheme(theme: Theme, storage?: Pick<Storage, "setItem">): void {
  try {
    storage?.setItem(THEME_KEY, theme);
  } catch {
    // localStorage bloqueado: el tema se aplica igual a esta sesión.
  }
  try {
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    // Sin DOM (prerender/tests): no hay nada que aplicar.
  }
}

/** Lee el tema guardado o la preferencia del sistema en la primera visita. */
export function initialTheme(storage?: Pick<Storage, "getItem">, prefersLight?: boolean): Theme {
  try {
    const saved = storage?.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Sin acceso: se usa la preferencia del sistema.
  }
  return prefersLight ? "light" : "dark";
}

/**
 * Script inline que se inyecta en <head> para aplicar el tema ANTES del primer
 * pintado. Sin esto la página se pintaba con el tema por defecto y saltaba al
 * guardado al montar React. Debe mantenerse sincronizado con `initialTheme`.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=null;try{s=window.localStorage.getItem("${THEME_KEY}")}catch(e){}
var t=(s==="light"||s==="dark")?s:((window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)?"light":"dark");
var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`;
