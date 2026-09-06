import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blogPostsQuery, topListsQuery } from "@/lib/content";
import { productsQuery } from "@/lib/catalog";

const slugRule = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/, { message: "El slug solo admite minúsculas, números y guiones" });
const urlRule = z.string().trim().url().max(500).or(z.literal(""));

type PostForm = {
  id: string | null;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  tags: string;
  published: boolean;
};

const emptyPost: PostForm = {
  id: null,
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  tags: "",
  published: true,
};

type ListForm = {
  id: string | null;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover_image_url: string;
  published: boolean;
  productIds: string[];
};

const emptyList: ListForm = {
  id: null,
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  cover_image_url: "",
  published: true,
  productIds: [],
};

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminContent() {
  const queryClient = useQueryClient();
  const { data: posts } = useQuery(blogPostsQuery);
  const { data: lists } = useQuery(topListsQuery);
  const { data: products } = useQuery(productsQuery);
  const [post, setPost] = useState<PostForm>(emptyPost);
  const [list, setList] = useState<ListForm>(emptyList);

  const savePost = useMutation({
    mutationFn: async (state: PostForm) => {
      const slug = slugRule.parse(state.slug);
      const cover = urlRule.parse(state.cover_image_url);
      if (state.title.trim().length < 2) throw new Error("El título es obligatorio");
      const payload = {
        slug,
        title: state.title.trim().slice(0, 160),
        excerpt: state.excerpt.trim().slice(0, 400),
        content: state.content,
        cover_image_url: cover || null,
        tags: state.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        published: state.published,
        updated_at: new Date().toISOString(),
      };
      if (state.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Artículo guardado");
      setPost(emptyPost);
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-post"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artículo eliminado");
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveList = useMutation({
    mutationFn: async (state: ListForm) => {
      const slug = slugRule.parse(state.slug);
      const cover = urlRule.parse(state.cover_image_url);
      if (state.title.trim().length < 2) throw new Error("El título es obligatorio");
      const payload = {
        slug,
        title: state.title.trim().slice(0, 160),
        subtitle: state.subtitle.trim().slice(0, 200),
        description: state.description,
        cover_image_url: cover || null,
        published: state.published,
      };
      let listId = state.id;
      if (listId) {
        const { error } = await supabase.from("top_lists").update(payload).eq("id", listId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("top_lists")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        listId = data.id;
      }

      await supabase.from("top_list_items").delete().eq("list_id", listId);
      if (state.productIds.length > 0) {
        const rows = state.productIds.map((productId, index) => ({
          list_id: listId as string,
          product_id: productId,
          position: index + 1,
          note: "",
        }));
        const { error } = await supabase.from("top_list_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Lista guardada");
      setList(emptyList);
      queryClient.invalidateQueries({ queryKey: ["top-lists"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("top_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lista eliminada");
      queryClient.invalidateQueries({ queryKey: ["top-lists"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function toggleProduct(id: string) {
    setList((current) =>
      current.productIds.includes(id)
        ? { ...current, productIds: current.productIds.filter((item) => item !== id) }
        : { ...current, productIds: [...current.productIds, id] },
    );
  }

  return (
    <>
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">
          {post.id ? "Editar artículo del blog" : "Nuevo artículo del blog"}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Título">
            <Input
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
              maxLength={160}
            />
          </Field>
          <Field label="Slug (URL)">
            <Input
              value={post.slug}
              onChange={(e) => setPost({ ...post, slug: e.target.value })}
              placeholder="mejores-auriculares-2026"
              maxLength={80}
            />
          </Field>
          <Field label="Imagen de cabecera (URL)" className="sm:col-span-2">
            <Input
              value={post.cover_image_url}
              onChange={(e) => setPost({ ...post, cover_image_url: e.target.value })}
              placeholder="https://…/imagen.jpg"
              maxLength={500}
            />
          </Field>
          {post.cover_image_url ? (
            <img
              src={post.cover_image_url}
              alt="Vista previa de la cabecera"
              className="aspect-16/9 w-full rounded-lg border border-border object-cover sm:col-span-2"
            />
          ) : null}
          <Field label="Entradilla" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={post.excerpt}
              onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
              maxLength={400}
            />
          </Field>
          <Field
            label="Contenido"
            hint={
              "Formato: # Título, ## Subtítulo, - lista, > cita, **negrita**, [texto](enlace), ![pie](url-de-imagen)"
            }
            className="sm:col-span-2"
          >
            <Textarea
              rows={12}
              value={post.content}
              onChange={(e) => setPost({ ...post, content: e.target.value })}
            />
          </Field>
          <Field label="Etiquetas (separadas por comas)">
            <Input
              value={post.tags}
              onChange={(e) => setPost({ ...post, tags: e.target.value })}
              placeholder="auriculares, gaming"
            />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={post.published}
            onChange={(e) => setPost({ ...post, published: e.target.checked })}
            className="size-4 accent-current"
          />
          Publicado
        </label>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => savePost.mutate(post)} disabled={savePost.isPending}>
            {post.id ? "Guardar cambios" : "Crear artículo"}
          </Button>
          {post.id ? (
            <Button variant="outline" onClick={() => setPost(emptyPost)}>
              Cancelar
            </Button>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {(posts ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  /{item.slug} · {item.published ? "publicado" : "borrador"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPost({
                      id: item.id,
                      slug: item.slug,
                      title: item.title,
                      excerpt: item.excerpt,
                      content: item.content,
                      cover_image_url: item.cover_image_url ?? "",
                      tags: item.tags.join(", "),
                      published: item.published,
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => removePost.mutate(item.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">
          {list.id ? "Editar lista Top" : "Nueva lista Top"}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Título">
            <Input
              value={list.title}
              onChange={(e) => setList({ ...list, title: e.target.value })}
              maxLength={160}
            />
          </Field>
          <Field label="Slug (URL)">
            <Input
              value={list.slug}
              onChange={(e) => setList({ ...list, slug: e.target.value })}
              placeholder="mejores-ratones-gaming"
              maxLength={80}
            />
          </Field>
          <Field label="Subtítulo" className="sm:col-span-2">
            <Input
              value={list.subtitle}
              onChange={(e) => setList({ ...list, subtitle: e.target.value })}
              maxLength={200}
            />
          </Field>
          <Field label="Imagen de cabecera (URL)" className="sm:col-span-2">
            <Input
              value={list.cover_image_url}
              onChange={(e) => setList({ ...list, cover_image_url: e.target.value })}
              placeholder="https://…/imagen.jpg"
              maxLength={500}
            />
          </Field>
          {list.cover_image_url ? (
            <img
              src={list.cover_image_url}
              alt="Vista previa de la cabecera"
              className="aspect-16/9 w-full rounded-lg border border-border object-cover sm:col-span-2"
            />
          ) : null}
          <Field
            label="Descripción"
            hint="Admite el mismo formato sencillo que los artículos."
            className="sm:col-span-2"
          >
            <Textarea
              rows={6}
              value={list.description}
              onChange={(e) => setList({ ...list, description: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-5">
          <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Productos del ranking (el orden es el de selección)
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(products ?? []).map((product) => {
              const index = list.productIds.indexOf(product.id);
              return (
                <label
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={index >= 0}
                    onChange={() => toggleProduct(product.id)}
                    className="size-4 accent-current"
                  />
                  <span className="flex-1">{product.name}</span>
                  {index >= 0 ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                      #{index + 1}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={list.published}
            onChange={(e) => setList({ ...list, published: e.target.checked })}
            className="size-4 accent-current"
          />
          Publicada
        </label>

        <div className="mt-6 flex gap-3">
          <Button onClick={() => saveList.mutate(list)} disabled={saveList.isPending}>
            {list.id ? "Guardar cambios" : "Crear lista"}
          </Button>
          {list.id ? (
            <Button variant="outline" onClick={() => setList(emptyList)}>
              Cancelar
            </Button>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {(lists ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  /{item.slug} · {item.top_list_items?.length ?? 0} productos ·{" "}
                  {item.published ? "publicada" : "borrador"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setList({
                      id: item.id,
                      slug: item.slug,
                      title: item.title,
                      subtitle: item.subtitle,
                      description: item.description,
                      cover_image_url: item.cover_image_url ?? "",
                      published: item.published,
                      productIds: [...(item.top_list_items ?? [])]
                        .sort((a, b) => a.position - b.position)
                        .map((row) => row.product_id),
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => removeList.mutate(item.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
