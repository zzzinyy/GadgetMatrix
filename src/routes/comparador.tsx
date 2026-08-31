import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  affiliateTagQuery,
  affiliateUrl,
  formatPrice,
  productsQuery,
  type ProductWithSpecs,
} from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const MAX = 3;

export const Route = createFileRoute("/comparador")({
  head: () => ({
    meta: [
      { title: "Comparador de gadgets: enfrenta dos o tres | GadgetRadar" },
      {
        name: "description",
        content:
          "Compara hasta 3 gadgets lado a lado: precio, valoración, pros, contras y ficha técnica completa para elegir mejor.",
      },
      { property: "og:title", content: "Comparador de gadgets | GadgetRadar" },
      {
        property: "og:description",
        content: "Elige hasta 3 productos y compara sus especificaciones técnicas al detalle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparatorPage,
});

function ComparatorPage() {
  const { data: products, isLoading } = useQuery(productsQuery);
  const { data: tag } = useQuery(affiliateTagQuery);
  const [selected, setSelected] = useState<string[]>([]);
  const [term, setTerm] = useState("");

  const all = products ?? [];
  const chosen = selected
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is ProductWithSpecs => Boolean(p));

  const candidates = all.filter((p) => {
    const q = term.trim().toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.brand ?? "").toLowerCase().includes(q) ||
      (p.categories?.name ?? "").toLowerCase().includes(q)
    );
  });

  const specLabels = useMemo(() => {
    const labels: string[] = [];
    for (const p of chosen) {
      for (const s of [...p.product_specs].sort((a, b) => a.position - b.position)) {
        if (!labels.includes(s.label)) labels.push(s.label);
      }
    }
    return labels;
  }, [chosen]);

  const prices = chosen.map((p) => p.price).filter((p): p is number => p != null);
  const bestPrice = prices.length ? Math.min(...prices) : null;
  const ratings = chosen.map((p) => p.rating).filter((r): r is number => r != null);
  const bestRating = ratings.length ? Math.max(...ratings) : null;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX ? prev : [...prev, id],
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Comparador de gadgets</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Selecciona hasta {MAX} productos y enfréntalos: precio, valoración, pros, contras y toda la
        ficha técnica en una sola tabla.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {selected.length}/{MAX} seleccionados
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar producto…"
              className="sm:w-64"
            />
            {selected.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Cargando productos…</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {candidates.map((p) => {
              const active = selected.includes(p.id);
              const disabled = !active && selected.length >= MAX;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {active ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  {p.name}
                </button>
              );
            })}
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin resultados.</p>
            ) : null}
          </div>
        )}
      </div>

      {chosen.length < 2 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Elige al menos 2 productos para ver la comparativa.
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40 bg-surface/60 p-4 text-left align-bottom font-medium text-muted-foreground">
                  Producto
                </th>
                {chosen.map((p) => (
                  <th key={p.id} className="border-l border-border p-4 text-left align-bottom">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            loading="lazy"
                            className="mb-3 h-24 w-full max-w-[160px] rounded-lg object-cover"
                          />
                        ) : null}
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {p.brand ?? p.categories?.name ?? "Gadget"}
                        </p>
                        <Link
                          to="/producto/$slug"
                          params={{ slug: p.slug }}
                          className="font-display text-base font-semibold hover:text-primary"
                        >
                          {p.name}
                        </Link>
                      </div>
                      <button
                        type="button"
                        aria-label={`Quitar ${p.name}`}
                        onClick={() => toggle(p.id)}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Precio">
                {chosen.map((p) => (
                  <Cell key={p.id}>
                    <span
                      className={cn(
                        "font-semibold",
                        bestPrice != null && p.price === bestPrice && "text-primary",
                      )}
                    >
                      {formatPrice(p.price, p.currency)}
                    </span>
                    {bestPrice != null && p.price === bestPrice ? (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                        Más barato
                      </span>
                    ) : null}
                  </Cell>
                ))}
              </Row>

              <Row label="Valoración">
                {chosen.map((p) => (
                  <Cell key={p.id}>
                    {p.rating != null ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          bestRating != null && p.rating === bestRating && "text-primary",
                        )}
                      >
                        <Star className="size-4 fill-current" />
                        {p.rating.toFixed(1)}
                      </span>
                    ) : (
                      <Empty />
                    )}
                  </Cell>
                ))}
              </Row>

              <Row label="Categoría">
                {chosen.map((p) => (
                  <Cell key={p.id}>{p.categories?.name ?? <Empty />}</Cell>
                ))}
              </Row>

              <Row label="Resumen">
                {chosen.map((p) => (
                  <Cell key={p.id}>
                    <span className="text-muted-foreground">{p.short_description}</span>
                  </Cell>
                ))}
              </Row>

              {specLabels.map((label) => (
                <Row key={label} label={label}>
                  {chosen.map((p) => {
                    const spec = p.product_specs.find((s) => s.label === label);
                    return <Cell key={p.id}>{spec ? spec.value : <Empty />}</Cell>;
                  })}
                </Row>
              ))}

              <Row label="A favor">
                {chosen.map((p) => (
                  <Cell key={p.id}>
                    {p.pros?.length ? (
                      <ul className="space-y-1">
                        {p.pros.map((pro) => (
                          <li key={pro} className="flex gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Empty />
                    )}
                  </Cell>
                ))}
              </Row>

              <Row label="En contra">
                {chosen.map((p) => (
                  <Cell key={p.id}>
                    {p.cons?.length ? (
                      <ul className="space-y-1">
                        {p.cons.map((con) => (
                          <li key={con} className="flex gap-2">
                            <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Empty />
                    )}
                  </Cell>
                ))}
              </Row>

              <Row label="">
                {chosen.map((p) => (
                  <Cell key={p.id}>
                    <Button asChild size="sm">
                      <a
                        href={affiliateUrl(p.amazon_url, tag)}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        onClick={() => trackEvent(p.id, "affiliate_click")}
                      >
                        Ver en Amazon
                      </a>
                    </Button>
                  </Cell>
                ))}
              </Row>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-border align-top">
      <th className="bg-surface/60 p-4 text-left font-medium text-muted-foreground">{label}</th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border-l border-border p-4">{children}</td>;
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}
