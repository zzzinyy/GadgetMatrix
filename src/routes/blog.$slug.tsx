import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { blogPostQuery } from "@/lib/content";
import { ShareButtons } from "@/components/ProductActions";
import { RichContent } from "@/components/RichContent";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | Blog GadgetMatrix` },
      {
        name: "description",
        content: "Artículo del blog de GadgetMatrix: análisis, guías de compra y noticias tech.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} | Blog GadgetMatrix` },
      { property: "og:description", content: "Análisis y guías de compra de gadgets." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const { data: post, isLoading, isError, refetch } = useQuery(blogPostQuery(slug));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-4 py-20">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-6 h-9 w-3/4 rounded bg-muted" />
        <div className="mt-6 aspect-16/9 w-full rounded-2xl bg-muted" />
        <div className="mt-6 h-4 w-full rounded bg-muted" />
        <div className="mt-3 h-4 w-5/6 rounded bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="font-display text-2xl font-bold">No pudimos cargar el artículo</h1>
        <p className="mt-2 text-muted-foreground">Comprueba tu conexión e inténtalo de nuevo.</p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => refetch()}>Reintentar</Button>
          <Button asChild variant="outline">
            <Link to="/blog">Volver al blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!post || !post.published) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="font-display text-2xl font-bold">Artículo no encontrado</h1>
        <p className="mt-2 text-muted-foreground">
          Puede que se haya retirado o que el enlace no sea correcto.
        </p>
        <Button asChild className="mt-6">
          <Link to="/blog">Volver al blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="pb-16">
      <header className="relative overflow-hidden border-b border-border">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="absolute inset-0 size-full object-cover opacity-30"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-primary/25 via-accent/15 to-transparent" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-background/40" />
        <div className="relative mx-auto max-w-3xl px-4 py-16">
          <nav className="text-sm text-muted-foreground">
            <Link to="/blog" className="hover:text-foreground">
              Blog
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">{post.title}</span>
          </nav>
          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary/15 px-3 py-1 font-medium text-primary">
              {new Date(post.published_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      {post.cover_image_url ? (
        <div className="mx-auto -mt-8 max-w-3xl px-4">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="aspect-16/9 w-full rounded-2xl border border-border object-cover shadow-lg"
          />
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4">
        <p className="mt-10 border-l-4 border-primary pl-4 text-lg leading-8 text-foreground/90">
          {post.excerpt}
        </p>
        <RichContent text={post.content} className="mt-6" />
        <ShareButtons title={post.title} />
      </div>
    </article>
  );
}
