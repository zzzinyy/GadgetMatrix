import { useCallback, useEffect, useMemo, useState } from "react";
import { browserStorage } from "@/lib/preferences";
import { applyTheme, getTheme, initialTheme, type Theme } from "@/lib/theme";
import { getLocale, setLocale, type Locale } from "@/lib/i18n";
import { SettingsContext, type Settings } from "@/hooks/useSettings";

function prefersLight(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  } catch {
    return false;
  }
}

/** Preferencias de UI (tema + idioma) con persistencia en localStorage. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getTheme(browserStorage()));
  const [locale, setLocaleState] = useState<Locale>(() => getLocale(browserStorage()));

  useEffect(() => {
    setThemeState(initialTheme(browserStorage(), prefersLight()));
    applyTheme(initialTheme(browserStorage(), prefersLight()), browserStorage());
    document.documentElement.lang = getLocale(browserStorage());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next, browserStorage());
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next, browserStorage());
      return next;
    });
  }, []);

  const changeLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocale(next, browserStorage());
  }, []);

  const value = useMemo(
    () => ({ theme, locale, toggleTheme, setTheme, setLocale: changeLocale }),
    [theme, locale, toggleTheme, setTheme, changeLocale],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
