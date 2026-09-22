import { LOCALE_INIT_SCRIPT } from "@/lib/i18n";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

/**
 * Script inline que se renderiza en <head> y aplica tema e idioma guardados
 * antes del primer pintado. Sin él la página se pintaba con el tema por
 * defecto y saltaba al guardado al montar React (y el idioma solo se corregía
 * después de hidratar `SettingsProvider`).
 */
export function ThemeCssInitializer() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: `${THEME_INIT_SCRIPT}${LOCALE_INIT_SCRIPT}` }}
    />
  );
}
