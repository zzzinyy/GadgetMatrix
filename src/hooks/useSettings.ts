import { createContext, useContext } from "react";
import type { Theme } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";

export type Settings = {
  theme: Theme;
  locale: Locale;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
};

export const SettingsContext = createContext<Settings | null>(null);

/** Preferencias de UI (tema + idioma). Debe usarse dentro de <SettingsProvider>. */
export function useSettings(): Settings {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("useSettings debe usarse dentro de SettingsProvider");
  return settings;
}

/**
 * Variante que no lanza. La necesitan los componentes que pueden renderizarse
 * fuera de <SettingsProvider> (404, error boundary del root): ahí no hay
 * preferencias guardadas y se asume el idioma por defecto.
 */
export function useOptionalSettings(): Settings | null {
  return useContext(SettingsContext);
}
