import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { blogPostsQuery } from "@/lib/content";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog de tecnología y gadgets | GadgetMatrix" },
      {
        name: "description",
        content:
          "Noticias, guías de compra y análisis de gadgets: auriculares, ratones, portátiles y accesorios para gaming y teletrabajo.",
      },
      { property: "og:title", content: "Blog de tecnología y gadgets | GadgetMatrix" },
      { property: "og:description", content: "Guías de compra y noticias de tecnología." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const { data: posts, isLoading } = useQuery(blogPostsQuery);
  const list = (posts ?? []).filter((post) => post.published);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold">Blog</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Noticias, guías de compra y trucos para sacar partido a tus gadgets.
      </p>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Cargando artículos…</p>
      ) : list.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Todavía no hay artículos publicados.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((post) => (
            <Link
              key={post.id}
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="glow-card flex flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-16/9 w-full overflow-hidden bg-surface">
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-linear-to-br from-primary/25 via-accent/15 to-transparent">
                    <span className="font-display text-2xl font-bold text-primary/70">
                      GadgetMatrix
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <span className="text-xs font-medium uppercase tracking-widest text-primary">
                  {new Date(post.published_at).toLocaleDateString("es-ES")}
                </span>
                <h2 className="font-display text-lg font-semibold leading-snug">{post.title}</h2>
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                {post.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
