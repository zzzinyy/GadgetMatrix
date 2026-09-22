import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Sparkles, Tags } from "lucide-react";
import heroImage from "@/assets/hero-gadgets.jpg";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { useT } from "@/hooks/useT";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GadgetMatrix — Los mejores gadgets analizados" },
      {
        name: "description",
        content:
          "Comparativas, fichas técnicas y precios actualizados de auriculares, portátiles, smartwatches y accesorios con enlaces a Amazon.",
      },
      { property: "og:title", content: "GadgetMatrix — Los mejores gadgets analizados" },
      {
        property: "og:description",
        content: "Fichas técnicas detalladas y enlaces de compra en Amazon.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const tr = useT();
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
              {tr("home", "badge")}
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-5xl">
              {tr("home", "title")}{" "}
              <span className="text-gradient">{tr("home", "titleHighlight")}</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">{tr("home", "intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/productos">{tr("home", "ctaCatalog")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sobre-nosotros">{tr("home", "ctaHow")}</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border glow-card">
            <img
              src={heroImage}
              alt={tr("home", "heroAlt")}
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
            { icon: Tags, title: tr("home", "pricesTitle"), text: tr("home", "pricesText") },
            { icon: ShieldCheck, title: tr("home", "specsTitle"), text: tr("home", "specsText") },
            { icon: Sparkles, title: tr("home", "prosTitle"), text: tr("home", "prosText") },
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
          <h2 className="font-display text-2xl font-bold">{tr("home", "featured")}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">{tr("home", "latest")}</h2>
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
