import { Link } from "@tanstack/react-router";
import { Cpu } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/productos", label: "Productos" },
  { to: "/comparador", label: "Comparador" },
  { to: "/quiz", label: "Quiz" },
  { to: "/top", label: "Top" },
  { to: "/chollos", label: "Chollos" },
  { to: "/blog", label: "Blog" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Cpu className="size-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Gadget<span className="text-gradient">Matrix</span>
          </span>
        </Link>

        <div className="order-2 shrink-0 xl:order-3">
          <AccountMenu />
        </div>
        <nav
          aria-label="Navegación principal"
          className="order-3 flex w-full items-center gap-1 overflow-x-auto text-sm xl:order-2 xl:w-auto"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "text-primary" }}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
