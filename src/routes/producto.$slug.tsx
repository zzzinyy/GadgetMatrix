import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Check, ExternalLink, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { affiliateTagQuery, affiliateUrl, formatPrice, productQuery } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/producto/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Ficha técnica y precio — ${params.slug} | GadgetRadar` },
      {
        name: "description",
        content:
          "Ficha técnica completa, análisis, pros y contras y precio actualizado con enlace de compra en Amazon.",
      },
      { property: "og:title", content: `Ficha técnica — ${params.slug} | GadgetRadar` },
      {
        property: "og:description",
        content: "Especificaciones detalladas, valoración y enlace de compra en Amazon.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading } = useQuery(productQuery(slug));
  const { data: tag } = useQuery(affiliateTagQuery);
  const trackedId = useRef<string | null>(null);
  const productId = product?.id ?? null;

  useEffect(() => {
    if (!productId || trackedId.current === productId) return;
    trackedId.current = productId;
    trackEvent(productId, "view");
  }, [productId]);


  if (isLoading) {
    return <p className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">Cargando ficha…</p>;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h1 className="font-display text-2xl font-bold">Producto no encontrado</h1>
        <p className="mt-2 text-muted-foreground">Puede que se haya retirado del catálogo.</p>
        <Button asChild className="mt-6">
          <Link to="/productos">Volver al catálogo</Link>
        </Button>
      </div>
    );
  }

  const specs = [...product.product_specs].sort((a, b) => a.position - b.position);
  const buyUrl = affiliateUrl(product.amazon_url, tag);

  return (
    <article className="mx-auto max-w-6xl px-4 py-12">
      <nav className="text-sm text-muted-foreground">
        <Link to="/productos" className="hover:text-foreground">
          Catálogo
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface glow-card">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="aspect-4/3 w-full object-cover"
            />
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.categories ? (
              <Badge variant="secondary">{product.categories.name}</Badge>
            ) : null}
            {product.brand ? <Badge variant="outline">{product.brand}</Badge> : null}
            {product.rating ? (
              <span className="flex items-center gap-1 text-sm text-accent">
                <Star className="size-4 fill-current" />
                {product.rating.toFixed(1)} / 5
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold">{product.name}</h1>
          <p className="mt-3 text-muted-foreground">{product.short_description}</p>

          <div className="mt-6 rounded-xl border border-border bg-card p-5 glow-card">
            <p className="text-sm text-muted-foreground">Precio orientativo</p>
            <p className="font-display text-3xl font-bold text-primary">
              {formatPrice(product.price, product.currency)}
            </p>
            <Button asChild size="lg" className="mt-4 w-full">
              <a
                href={buyUrl}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                onClick={() => trackEvent(product.id, "affiliate_click")}
              >
                Ver precio en Amazon
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Enlace de afiliado. Podemos recibir una comisión sin coste extra para ti.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <h2 className="font-display text-xl font-semibold">Análisis</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {(product.pros.length > 0 || product.cons.length > 0) && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-accent">A favor</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {product.pros.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-destructive">
                  En contra
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {product.cons.map((item) => (
                    <li key={item} className="flex gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Ficha técnica</h2>
          <dl className="mt-3 overflow-hidden rounded-xl border border-border">
            {specs.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Todavía no hay especificaciones para este producto.
              </p>
            ) : (
              specs.map((spec, i) => (
                <div
                  key={spec.id}
                  className={`grid grid-cols-2 gap-4 px-5 py-3 text-sm ${
                    i % 2 === 0 ? "bg-card" : "bg-surface"
                  }`}
                >
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="font-medium">{spec.value}</dd>
                </div>
              ))
            )}
          </dl>
        </section>
      </div>
    </article>
  );
}
