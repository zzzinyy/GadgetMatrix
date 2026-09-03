import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { productsQuery, formatPrice } from "@/lib/catalog";
import { buildDeals, priceHistoryQuery } from "@/lib/content";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/chollos")({
  head: () => ({
    meta: [
      { title: "Chollos y bajadas de precio en gadgets | GadgetMatrix" },
      {
        name: "description",
        content:
          "Ofertas reales: gadgets que han bajado de precio respecto a su máximo reciente, con porcentaje de descuento y enlace de compra.",
      },
      { property: "og:title", content: "Chollos y bajadas de precio | GadgetMatrix" },
      { property: "og:description", content: "Los gadgets que más han bajado de precio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { data: products, isLoading } = useQuery(productsQuery);
  const { data: history } = useQuery(priceHistoryQuery);
  const deals = buildDeals(products ?? [], history ?? []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="flex items-center gap-3 font-display text-3xl font-bold">
        <Flame className="size-7 text-accent" /> Chollos
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Seguimos el histórico de precios de cada gadget y te mostramos las bajadas reales frente a su
        máximo reciente.
      </p>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Buscando ofertas…</p>
      ) : deals.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Ahora mismo no hay bajadas de precio. Vuelve pronto o crea una alerta desde la ficha del
          producto.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <Link
              key={deal.product.id}
              to="/producto/$slug"
              params={{ slug: deal.product.slug }}
              className="glow-card flex flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-4/3 bg-surface">
                {deal.product.image_url ? (
                  <img
                    src={deal.product.image_url}
                    alt={deal.product.name}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : null}
                <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground">
                  -{deal.discount}%
                </Badge>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h2 className="font-display text-lg font-semibold leading-snug">
                  {deal.product.name}
                </h2>
                <div className="mt-auto flex items-baseline gap-3 pt-3">
                  <span className="font-display text-xl font-bold text-primary">
                    {formatPrice(deal.currentPrice, deal.product.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(deal.previousPrice, deal.product.currency)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
