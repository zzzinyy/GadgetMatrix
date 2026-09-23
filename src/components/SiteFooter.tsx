import { Link } from "@tanstack/react-router";
import { useT } from "@/hooks/useT";

export function SiteFooter() {
  const tr = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-base font-bold">GadgetMatrix</p>
          <p className="mt-2 text-sm text-muted-foreground">{tr("brand", "tagline")}</p>
        </div>
        <div className="text-sm">
          <p className="font-medium">{tr("footer", "navTitle")}</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/productos" className="hover:text-foreground">
                {tr("footer", "allProducts")}
              </Link>
            </li>
            <li>
              <Link to="/sobre-nosotros" className="hover:text-foreground">
                {tr("footer", "about")}
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-foreground">
                {tr("footer", "adminAccess")}
              </Link>
            </li>
          </ul>
          <p className="mt-5 font-medium">{tr("footer", "legalTitle")}</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/privacidad" className="hover:text-foreground">
                {tr("footer", "privacy")}
              </Link>
            </li>
            <li>
              <Link to="/aviso-legal" className="hover:text-foreground">
                {tr("footer", "legal")}
              </Link>
            </li>
            <li>
              <Link to="/terminos" className="hover:text-foreground">
                {tr("footer", "terms")}
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{tr("footer", "affiliateTitle")}</p>
          <p className="mt-2">{tr("footer", "affiliateText")}</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {year} GadgetMatrix. {tr("footer", "rights")}
      </div>
    </footer>
  );
}
