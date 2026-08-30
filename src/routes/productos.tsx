import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Search = { categoria?: string };

export const Route = createFileRoute("/productos")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    categoria: typeof search["categoria"] === "string" ? search["categoria"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo de gadgets analizados | GadgetRadar" },
      {
        name: "description",
        content:
          "Todos nuestros análisis de tecnología: auriculares, portátiles, smartwatches y accesorios con ficha técnica y precio.",
      },
      { property: "og:title", content: "Catálogo de gadgets analizados | GadgetRadar" },
      {
        property: "og:description",
        content: "Filtra por categoría y compara fichas técnicas y precios.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { categoria } = Route.useSearch();
  const navigate = useNavigate({ from: "/productos" });
  const [term, setTerm] = useState("");
  const { data: products, isLoading } = useQuery(productsQuery);
  const { data: categories } = useQuery(categoriesQuery);

  const filtered = (products ?? []).filter((p) => {
    const byCat = !categoria || p.categories?.slug === categoria;
    const q = term.trim().toLowerCase();
    const byTerm =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.brand ?? "").toLowerCase().includes(q) ||
      p.short_description.toLowerCase().includes(q);
    return byCat && byTerm;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Catálogo</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {filtered.length} producto{filtered.length === 1 ? "" : "s"} con ficha técnica completa y
        enlace de compra en Amazon.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate({ search: {} })}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
              !categoria ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground",
            )}
          >
            Todas
          </button>
          {(categories ?? []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate({ search: { categoria: cat.slug } })}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
                categoria === cat.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar producto o marca…"
          className="sm:max-w-xs"
        />
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Cargando productos…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No hay productos que coincidan con tu búsqueda.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
