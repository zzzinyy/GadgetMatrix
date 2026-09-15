import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoriesQuery, productsQuery } from "@/lib/catalog";

const slugRule = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/, { message: "El slug solo admite minúsculas, números y guiones" });

type CategoryForm = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
};

const emptyCategory: CategoryForm = {
  id: null,
  slug: "",
  name: "",
  description: "",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategories() {
  const queryClient = useQueryClient();
  const { data: categories } = useQuery(categoriesQuery);
  const { data: products } = useQuery(productsQuery);
  const [form, setForm] = useState<CategoryForm>(emptyCategory);

  const productCountByCategory = new Map<string, number>();
  for (const product of products ?? []) {
    if (!product.category_id) continue;
    const key: string = product.category_id;
    productCountByCategory.set(key, (productCountByCategory.get(key) ?? 0) + 1);
  }

  const saveCategory = useMutation({
    mutationFn: async (state: CategoryForm) => {
      const slug = slugRule.parse(state.slug);
      const name = state.name.trim();
      if (name.length < 2) throw new Error("El nombre es obligatorio");
      const payload = {
        slug,
        name: name.slice(0, 80),
        description: state.description.trim() ? state.description.trim().slice(0, 500) : null,
      };
      if (state.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Categoría guardada");
      setForm(emptyCategory);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoría eliminada. Los productos pasan a 'Sin categoría'.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">Categorías ({categories?.length ?? 0})</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Aparecen como filtro en Productos, en la portada y en el desplegable del formulario de
        producto. Al eliminar una, sus productos no se borran: quedan como &ldquo;Sin
        categoría&rdquo;.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Nombre
          </Label>
          <Input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((prev) => ({
                ...prev,
                name,
                slug: prev.id || prev.slug ? prev.slug : slugify(name),
              }));
            }}
            placeholder="Neveras"
            maxLength={80}
          />
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Slug
          </Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            placeholder="neveras"
            maxLength={80}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Descripción (opcional)
          </Label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Frigoríficos y neveras portátiles…"
            maxLength={500}
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => saveCategory.mutate(form)} disabled={saveCategory.isPending}>
          {form.id ? "Guardar cambios" : "Crear categoría"}
        </Button>
        {form.id ? (
          <Button variant="outline" onClick={() => setForm(emptyCategory)}>
            Cancelar
          </Button>
        ) : null}
      </div>
      <div className="mt-6 space-y-3">
        {(categories ?? []).map((category) => (
          <div
            key={category.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
          >
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-sm text-muted-foreground">
                /{category.slug} · {productCountByCategory.get(category.id) ?? 0} producto(s)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setForm({
                    id: category.id,
                    slug: category.slug,
                    name: category.name,
                    description: category.description ?? "",
                  });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Editar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeCategory.mutate(category.id)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
