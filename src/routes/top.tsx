import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { topListsQuery } from "@/lib/content";

export const Route = createFileRoute("/top")({
  head: () => ({
    meta: [
      { title: "Top recomendados: mejores gadgets por categoría | GadgetMatrix" },
      {
        name: "description",
        content:
          "Listas dinámicas con los mejores gadgets por categoría y presupuesto: auriculares, ratones, accesorios de teletrabajo y más.",
      },
      { property: "og:title", content: "Top recomendados por categoría | GadgetMatrix" },
      { property: "og:description", content: "Los mejores gadgets seleccionados por categoría." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopListsPage,
});

function TopListsPage() {
  const { data: lists, isLoading } = useQuery(topListsQuery);
  const published = (lists ?? []).filter((list) => list.published);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="flex items-center gap-3 font-display text-3xl font-bold">
        <Trophy className="size-7 text-accent" /> Top recomendados
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Selecciones cerradas por categoría, uso y presupuesto para que no tengas que comparar cien
        fichas técnicas.
      </p>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Cargando listas…</p>
      ) : published.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Todavía no hay listas publicadas.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {published.map((list) => (
            <Link
              key={list.id}
              to="/top/$slug"
              params={{ slug: list.slug }}
              className="glow-card rounded-xl border border-border bg-card p-6"
            >
              <h2 className="font-display text-xl font-semibold">{list.title}</h2>
              <p className="mt-1 text-sm text-primary">{list.subtitle}</p>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{list.description}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {list.top_list_items?.length ?? 0} productos →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
