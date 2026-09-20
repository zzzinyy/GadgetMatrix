/**
 * Idioma de la interfaz (español por defecto, inglés opt-in). Solo cubre los
 * textos propios de la UI que no vienen de la base de datos (cabecera,
 * buscador, botones comunes); el contenido editorial sigue en español.
 */

export const LOCALE_KEY = "gadgetmatrix:locale";
export type Locale = "es" | "en";

const STRINGS = {
  nav: {
    home: { es: "Inicio", en: "Home" },
    products: { es: "Productos", en: "Products" },
    comparator: { es: "Comparador", en: "Compare" },
    quiz: { es: "Quiz", en: "Quiz" },
    tops: { es: "Top", en: "Top" },
    deals: { es: "Chollos", en: "Deals" },
    blog: { es: "Blog", en: "Blog" },
  },
  search: {
    button: { es: "Buscar…", en: "Search…" },
    placeholder: { es: "Busca productos, artículos, tops…", en: "Search products, posts, tops…" },
    empty: { es: "Escribe para buscar en todo el sitio.", en: "Type to search the whole site." },
    noResults: {
      es: "Sin resultados. Prueba con otra palabra.",
      en: "No results. Try another word.",
    },
  },
  favorites: {
    add: { es: "Guardar en favoritos", en: "Save to favorites" },
    remove: { es: "Quitar de favoritos", en: "Remove from favorites" },
    title: { es: "Favoritos", en: "Favorites" },
    empty: {
      es: "Aún no tienes favoritos. Toca el corazón de cualquier producto.",
      en: "No favorites yet. Tap the heart on any product.",
    },
  },
  history: {
    title: { es: "Vistos recientemente", en: "Recently viewed" },
    clear: { es: "Borrar historial", en: "Clear history" },
  },
  theme: {
    toLight: { es: "Cambiar a modo claro", en: "Switch to light mode" },
    toDark: { es: "Cambiar a modo oscuro", en: "Switch to dark mode" },
  },
  language: { es: "Idioma", en: "Language" },
} as const;

export type StringGroup = keyof typeof STRINGS;

export function getLocale(storage?: Pick<Storage, "getItem">): Locale {
  try {
    return storage?.getItem(LOCALE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function setLocale(locale: Locale, storage?: Pick<Storage, "setItem">): void {
  try {
    storage?.setItem(LOCALE_KEY, locale);
  } catch {
    // localStorage bloqueado: se aplica igual a esta sesión.
  }
  try {
    document.documentElement.lang = locale;
  } catch {
    // Sin DOM (prerender/tests): no hay nada que aplicar.
  }
}

/** Devuelve el texto de una clave en el idioma activo. */
export function t<Group extends StringGroup>(
  group: Group,
  key: keyof (typeof STRINGS)[Group],
  locale: Locale,
): string {
  const entry = STRINGS[group][key] as { es: string; en: string };
  return entry[locale] ?? entry.es;
}
