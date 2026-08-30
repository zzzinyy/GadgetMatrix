import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Sparkles, Tags } from "lucide-react";
import heroImage from "@/assets/hero-gadgets.jpg";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { categoriesQuery, productsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GadgetRadar — Los mejores gadgets analizados" },
      {
        name: "description",
        content:
          "Comparativas, fichas técnicas y precios actualizados de auriculares, portátiles, smartwatches y accesorios con enlaces a Amazon.",
      },
      { property: "og:title", content: "GadgetRadar — Los mejores gadgets analizados" },
      {
        property: "og:description",
        content: "Fichas técnicas detalladas y enlaces de compra en Amazon.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products } = useQuery(productsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const featured = (products ?? []).filter((p) => p.featured).slice(0, 3);
  const latest = (products ?? []).slice(0, 6);

  return (
    <div>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Tecnología y gadgets
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Elige bien tu próximo <span className="text-gradient">gadget</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Analizamos auriculares, portátiles, smartwatches y accesorios. Fichas técnicas
              completas, pros y contras, y el enlace directo para comprarlos en Amazon.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/productos">Ver catálogo</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sobre-nosotros">Cómo analizamos</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border glow-card">
            <img
              src={heroImage}
              alt="Auriculares, portátil, smartwatch y teclado mecánico sobre fondo oscuro"
              width={1600}
              height={1008}
              className="size-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Tags,
              title: "Precios claros",
              text: "Precio de referencia y enlace de afiliado actualizado a Amazon.",
            },
            {
              icon: ShieldCheck,
              title: "Fichas técnicas",
              text: "Cada producto con sus especificaciones detalladas en base de datos.",
            },
            {
              icon: Sparkles,
              title: "Pros y contras",
              text: "Lo bueno y lo mejorable, sin rodeos, antes de que compres.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6 glow-card">
              <item.icon className="size-5 text-primary" />
              <h2 className="mt-3 font-display text-base font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <h2 className="font-display text-2xl font-bold">Destacados</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Últimos análisis</h2>
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).map((cat) => (
              <Link
                key={cat.id}
                to="/productos"
                search={{ categoria: cat.slug }}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
