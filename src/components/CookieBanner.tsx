import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useT";

export const CONSENT_KEY = "gadgetmatrix:consent";

/**
 * Aviso de cookies RGPD. Solo aparece si el visitante no ha decidido aún.
 * La elección (granted/denied) se guarda en localStorage y se expone en
 * window.__adConsent para que AdSense (cuando se active) la lea.
 */
export function CookieBanner() {
  const tr = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored !== "granted" && stored !== "denied") setVisible(true);
    } catch {
      // localStorage bloqueado: no se molesta al visitante.
    }
  }, []);

  function decide(value: "granted" | "denied") {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // sin persistencia: se oculta igualmente en esta sesión
    }
    window.dispatchEvent(new CustomEvent("gadgetmatrix:consent", { detail: value }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={tr("cookies", "text")}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card/95 p-4 backdrop-blur"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">{tr("cookies", "text")}</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/privacidad">{tr("cookies", "privacy")}</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => decide("denied")}>
            {tr("cookies", "reject")}
          </Button>
          <Button size="sm" onClick={() => decide("granted")}>
            {tr("cookies", "accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}