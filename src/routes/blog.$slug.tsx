import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { blogPostQuery } from "@/lib/content";
import { ShareButtons } from "@/components/ProductActions";
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
  const { data: post, isLoading } = useQuery(blogPostQuery(slug));

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Cargando artículo…</p>;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="font-display text-2xl font-bold">Artículo no encontrado</h1>
        <Button asChild className="mt-6">
          <Link to="/blog">Volver al blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <nav className="text-sm text-muted-foreground">
        <Link to="/blog" className="hover:text-foreground">
          Blog
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">{post.title}</span>
      </nav>

      <h1 className="mt-6 font-display text-3xl font-bold">{post.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {new Date(post.published_at).toLocaleDateString("es-ES")}
        {post.tags.length > 0 ? ` · ${post.tags.join(", ")}` : ""}
      </p>

      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="mt-6 aspect-16/9 w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      <p className="mt-6 text-lg text-muted-foreground">{post.excerpt}</p>
      <div className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">
        {post.content}
      </div>

      <ShareButtons title={post.title} />
    </article>
  );
}
