import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { reviewsQuery } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`size-4 ${n <= value ? "fill-current" : "opacity-30"}`} />
      ))}
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: reviews } = useQuery(reviewsQuery(productId));
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        rating,
        title: title.trim().slice(0, 120),
        body: body.trim().slice(0, 2000),
        author_name:
          (user?.user_metadata?.["full_name"] as string) ?? user?.email?.split("@")[0] ?? "Usuario",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      setRating(5);
      toast.success("¡Gracias por tu reseña!");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: () => toast.error("No se pudo publicar la reseña."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews"] }),
  });

  const list = reviews ?? [];
  const average = list.length
    ? list.reduce((sum, review) => sum + review.rating, 0) / list.length
    : 0;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-semibold">Reseñas de usuarios</h2>
        {list.length > 0 ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={Math.round(average)} /> {average.toFixed(1)} · {list.length} reseña
            {list.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {user ? (
        <div className="mt-5 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tu valoración:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} estrellas`}>
                <Star
                  className={`size-5 text-accent ${n <= rating ? "fill-current" : "opacity-30"}`}
                />
              </button>
            ))}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de tu reseña"
            className="mt-4"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Cuenta tu experiencia con este producto…"
            rows={4}
            className="mt-3"
          />
          <Button
            className="mt-3"
            disabled={create.isPending || body.trim().length < 5}
            onClick={() => create.mutate()}
          >
            Publicar reseña
          </Button>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">
            Inicia sesión
          </Link>{" "}
          para dejar tu reseña.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay reseñas. ¡Sé el primero!</p>
        ) : (
          list.map((review) => (
            <article key={review.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Stars value={review.rating} />
                  <p className="mt-2 font-medium">{review.title || "Sin título"}</p>
                  <p className="text-xs text-muted-foreground">
                    {review.author_name} ·{" "}
                    {new Date(review.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                {user?.id === review.user_id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(review.id)}
                    aria-label="Eliminar reseña"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{review.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
