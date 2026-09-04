import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Search = { categoria?: string | undefined };

export const Route = createFileRoute("/productos")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["categoria"] === "string" ? { categoria: search["categoria"] } : {},

  head: () => ({
    meta: [
      { title: "Catálogo de gadgets analizados | GadgetMatrix" },
      {
        name: "description",
        content:
          "Todos nuestros análisis de tecnología: auriculares, portátiles, smartwatches y accesorios con ficha técnica y precio.",
      },
      { property: "og:title", content: "Catálogo de gadgets analizados | GadgetMatrix" },
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
  const [brand, setBrand] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sort, setSort] = useState("recent");
  const { data: products, isLoading } = useQuery(productsQuery);
  const { data: categories } = useQuery(categoriesQuery);

  const brands = Array.from(
    new Set((products ?? []).map((p) => p.brand).filter((b): b is string => Boolean(b))),
  ).sort();

  const filtered = (products ?? [])
    .filter((p) => {
      const byCat = !categoria || p.categories?.slug === categoria;
      const q = term.trim().toLowerCase();
      const byTerm =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q);
      const byBrand = brand === "all" || p.brand === brand;
      const max = Number(maxPrice);
      const byPrice = !maxPrice || Number.isNaN(max) || (p.price != null && p.price <= max);
      const byRating = Number(minRating) === 0 || (p.rating ?? 0) >= Number(minRating);
      return byCat && byTerm && byBrand && byPrice && byRating;
    })
    .sort((a, b) => {
      if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (sort === "price-desc") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });

  const resetFilters = () => {
    setTerm("");
    setBrand("all");
    setMaxPrice("");
    setMinRating("0");
    setSort("recent");
    navigate({ search: {} });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Catálogo</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {filtered.length} producto{filtered.length === 1 ? "" : "s"} con ficha técnica completa y
        enlace de compra en Amazon.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
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

      <div className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar producto o marca…"
        />
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger>
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          inputMode="numeric"
          placeholder="Precio máx. (€)"
        />
        <Select value={minRating} onValueChange={setMinRating}>
          <SelectTrigger>
            <SelectValue placeholder="Valoración" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Cualquier valoración</SelectItem>
            <SelectItem value="3">3★ o más</SelectItem>
            <SelectItem value="4">4★ o más</SelectItem>
            <SelectItem value="4.5">4,5★ o más</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más recientes</SelectItem>
            <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
            <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
            <SelectItem value="rating">Mejor valorados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={resetFilters}
        className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Limpiar filtros
      </button>

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

