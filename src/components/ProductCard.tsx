import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, type ProductWithSpecs } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";

export function ProductCard({ product }: { product: ProductWithSpecs }) {
  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      onClick={() => trackEvent(product.id, "card_click")}
      className="glow-card hover:glow-card-hover group flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-surface">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        {product.featured ? (
          <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground">
            Destacado
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-widest">{product.categories?.name ?? "Gadget"}</span>
          {product.rating ? (
            <span className="flex items-center gap-1 text-accent">
              <Star className="size-3.5 fill-current" />
              {product.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.short_description}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-xl font-bold text-primary">
            {formatPrice(product.price, product.currency)}
          </span>
          <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
            Ver ficha →
          </span>
        </div>
      </div>
    </Link>
  );
}
