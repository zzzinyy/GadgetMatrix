import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useAchievementTracker } from "@/hooks/useAchievements";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SettingsProvider } from "@/components/SettingsProvider";
import { Toaster } from "@/components/ui/sonner";

const notFoundLinks = [
  { to: "/productos", label: "Catálogo de productos" },
  { to: "/chollos", label: "Chollos del día" },
  { to: "/comparador", label: "Comparador" },
  { to: "/blog", label: "Blog" },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Error 404</p>
        <h1 className="mt-2 font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Esta página no existe</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Puede que el enlace esté mal escrito, que el producto ya no esté en el catálogo o que la
          página se haya movido. Te dejamos algunos atajos para seguir explorando.
        </p>
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {notFoundLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="flex h-full items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página no ha cargado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ha fallado algo por nuestra parte. Vuelve a intentarlo o regresa al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GadgetMatrix — Análisis y ofertas de tecnología" },
      {
        name: "description",
        content:
          "Fichas técnicas, análisis y precios de gadgets y tecnología con enlaces de compra en Amazon.",
      },
      { property: "og:title", content: "GadgetMatrix — Análisis y ofertas de tecnología" },
      {
        property: "og:description",
        content: "Fichas técnicas, análisis y precios de los mejores gadgets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      {
        rel: "icon",
        href: `${import.meta.env.BASE_URL}favicon.svg?v=2`,
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AchievementTracker />
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        {/* Abajo a la derecha: arriba taparía la cabecera fija y sus botones. */}
        <Toaster position="bottom-right" />
      </SettingsProvider>
    </QueryClientProvider>
  );
}

/** Desbloquea los logros de navegación sin renderizar nada. */
function AchievementTracker() {
  useAchievementTracker();
  return null;
}
