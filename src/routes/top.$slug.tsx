import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { topListsQuery } from "@/lib/content";
import { affiliateTagQuery, affiliateUrl, formatPrice, productsQuery } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/top/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | Top GadgetMatrix` },
      {
        name: "description",
        content: "Selección de los mejores gadgets con precio, ficha técnica y enlace de compra.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} | Top GadgetMatrix` },
      { property: "og:description", content: "Ranking de gadgets recomendados." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopListPage,
});

function TopListPage() {
  const { slug } = Route.useParams();
  const { data: lists, isLoading, isError, refetch } = useQuery(topListsQuery);
  const { data: products, isLoading: productsLoading } = useQuery(productsQuery);
  const { data: tag } = useQuery(affiliateTagQuery);

  const list = (lists ?? []).find((item) => item.slug === slug);

  if (isLoading || productsLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse px-4 py-20">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-6 h-9 w-2/3 rounded bg-muted" />
        <div className="mt-8 space-y-4">
          <div className="h-40 w-full rounded-xl bg-muted" />
          <div className="h-40 w-full rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <h1 className="font-display text-2xl font-bold">No pudimos cargar la lista</h1>
        <p className="mt-2 text-muted-foreground">Comprueba tu conexión e inténtalo de nuevo.</p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => refetch()}>Reintentar</Button>
          <Button asChild variant="outline">
            <Link to="/top">Ver todas las listas</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!list || !list.published) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <h1 className="font-display text-2xl font-bold">Lista no encontrada</h1>
        <p className="mt-2 text-muted-foreground">
          Puede que se haya retirado o que el enlace no sea correcto.
        </p>
        <Button asChild className="mt-6">
          <Link to="/top">Ver todas las listas</Link>
        </Button>
      </div>
    );
  }

  const items = [...(list.top_list_items ?? [])].sort((a, b) => a.position - b.position);
  const resolved = items.filter((item) => (products ?? []).some((p) => p.id === item.product_id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <nav className="text-sm text-muted-foreground">
        <Link to="/top" className="hover:text-foreground">
          Top recomendados
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">{list.title}</span>
      </nav>

      <h1 className="mt-6 font-display text-3xl font-bold">{list.title}</h1>
      <p className="mt-2 text-primary">{list.subtitle}</p>
      <p className="mt-4 whitespace-pre-line text-muted-foreground">{list.description}</p>

      {resolved.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Esta lista todavía no tiene productos disponibles.
        </p>
      ) : null}

      <ol className="mt-10 space-y-6">
        {resolved.map((item, index) => {
          const product = (products ?? []).find((p) => p.id === item.product_id);
          if (!product) return null;
          const url = affiliateUrl(product.amazon_url, tag);
          return (
            <li
              key={item.id}
              className="glow-card grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[200px_1fr]"
            >
              <div className="relative overflow-hidden rounded-lg bg-surface">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover"
                  />
                ) : null}
                <span className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">
                  {index + 1}
                </span>
              </div>
              <div className="flex flex-col">
                <h2 className="font-display text-xl font-semibold">
                  <Link to="/producto/$slug" params={{ slug: product.slug }}>
                    {product.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{product.short_description}</p>
                {item.note ? <p className="mt-3 text-sm text-accent">{item.note}</p> : null}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  <span className="font-display text-xl font-bold text-primary">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  <Button asChild size="sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="nofollow sponsored noopener noreferrer"
                      onClick={() => trackEvent(product.id, "affiliate_click")}
                    >
                      Ver en Amazon <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
