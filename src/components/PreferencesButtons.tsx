import { useEffect, useState } from "react";
import { Heart, Languages, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/useSettings";
import { browserStorage, getFavorites, toggleFavorite } from "@/lib/preferences";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Botón sol/luna para alternar entre modo oscuro y claro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, locale } = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = theme === "dark";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={t("theme", dark ? "toLight" : "toDark", locale)}
      title={t("theme", dark ? "toLight" : "toDark", locale)}
      className={className}
    >
      {mounted && !dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

/** Selector de idioma ES/EN para los textos de la interfaz. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useSettings();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${t("language", "es", locale)}: ${locale.toUpperCase()}`}
          className={cn("gap-1.5", className)}
        >
          <Languages className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setLocale("es")}>
          Español {locale === "es" ? "✓" : ""}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLocale("en")}>
          English {locale === "en" ? "✓" : ""}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Acceso a favoritos con contador, visible en la cabecera. */
export function FavoritesLink({ className }: { className?: string }) {
  const { locale } = useSettings();
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(getFavorites(browserStorage()).length);
    const onFocus = () => setCount(getFavorites(browserStorage()).length);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={t("headerExtras", "favorites", locale)}
      title={t("headerExtras", "favorites", locale)}
      className={cn("relative gap-1.5", className)}
      onClick={() => {
        window.location.href = "/perfil#favoritos";
      }}
    >
      <Heart className={cn("size-4", count > 0 && "fill-destructive text-destructive")} aria-hidden="true" />
      {count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {count}
        </span>
      ) : null}
    </Button>
  );
}

/** Corazón de favorito para tarjetas y fichas de producto. */
export function FavoriteButton({ slug, className }: { slug: string; className?: string }) {
  const { locale } = useSettings();
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    setFavorite(getFavorites(browserStorage()).includes(slug));
  }, [slug]);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setFavorite(toggleFavorite(slug, browserStorage()));
      }}
      aria-pressed={favorite}
      aria-label={t("favorites", favorite ? "remove" : "add", locale)}
      title={t("favorites", favorite ? "remove" : "add", locale)}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border transition-colors",
        favorite
          ? "border-destructive/50 bg-destructive/15 text-destructive"
          : "border-border bg-background/80 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {favorite ? "♥" : "♡"}
      </span>
    </button>
  );
}
