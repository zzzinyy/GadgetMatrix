import { useMemo } from "react";
import { useOptionalSettings } from "@/hooks/useSettings";
import { createTranslator, type Locale, type Translator } from "@/lib/i18n";

/**
 * Traductor reactivo: devuelve `tr(grupo, clave)` ya atado al idioma activo y
 * se recalcula solo cuando cambia el idioma, así que cualquier componente que
 * lo use se vuelve a pintar al pulsar el selector ES/EN.
 *
 * Usa `useOptionalSettings` a propósito: el 404 y el error boundary del root
 * pueden renderizarse fuera de <SettingsProvider>, y ahí debe caer a español
 * en vez de lanzar.
 */
export function useT(): Translator {
  const settings = useOptionalSettings();
  const locale: Locale = settings?.locale ?? "es";
  return useMemo(() => createTranslator(locale), [locale]);
}
