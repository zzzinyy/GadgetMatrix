import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-base font-bold">GadgetMatrix</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Análisis y fichas técnicas de tecnología y gadgets, con enlaces de compra en Amazon.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Navegación</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/productos" className="hover:text-foreground">
                Todos los productos
              </Link>
            </li>
            <li>
              <Link to="/sobre-nosotros" className="hover:text-foreground">
                Sobre nosotros
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-foreground">
                Acceso administrador
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Aviso de afiliados</p>
          <p className="mt-2">
            En calidad de Afiliado de Amazon, obtenemos ingresos por las compras adscritas que
            cumplen los requisitos aplicables. Los precios pueden variar respecto a los mostrados.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GadgetMatrix. Todos los derechos reservados.
      </div>
    </footer>
  );
}
