import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  affiliateTagQuery,
  categoriesQuery,
  productsQuery,
  formatPrice,
  type ProductWithSpecs,
} from "@/lib/catalog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel de administración | GadgetRadar" },
      { name: "description", content: "Gestiona productos, fichas técnicas y ajustes del sitio." },
      { property: "og:title", content: "Panel de administración | GadgetRadar" },
      { property: "og:description", content: "Gestión del catálogo de GadgetRadar." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const productSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, { message: "El slug solo admite minúsculas, números y guiones" }),
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(80),
  category_id: z.string().uuid().nullable(),
  short_description: z.string().trim().max(200),
  description: z.string().trim().max(5000),
  price: z.number().nonnegative().max(1000000).nullable(),
  image_url: z.string().trim().url().max(500).or(z.literal("")),
  amazon_url: z.string().trim().url({ message: "URL de Amazon no válida" }).max(500),
  rating: z.number().min(0).max(5).nullable(),
});

type FormState = {
  id: string | null;
  slug: string;
  name: string;
  brand: string;
  category_id: string;
  short_description: string;
  description: string;
  price: string;
  image_url: string;
  amazon_url: string;
  rating: string;
  featured: boolean;
  pros: string;
  cons: string;
  specs: string;
};

const emptyForm: FormState = {
  id: null,
  slug: "",
  name: "",
  brand: "",
  category_id: "",
  short_description: "",
  description: "",
  price: "",
  image_url: "",
  amazon_url: "",
  rating: "",
  featured: false,
  pros: "",
  cons: "",
  specs: "",
};

function toLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function AdminPage() {
  const { session, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: products } = useQuery(productsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const { data: savedTag } = useQuery(affiliateTagQuery);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [tag, setTag] = useState("");

  useEffect(() => {
    if (savedTag !== undefined) setTag(savedTag);
  }, [savedTag]);

  const saveProduct = useMutation({
    mutationFn: async (state: FormState) => {
      const parsed = productSchema.safeParse({
        slug: state.slug,
        name: state.name,
        brand: state.brand,
        category_id: state.category_id || null,
        short_description: state.short_description,
        description: state.description,
        price: state.price === "" ? null : Number(state.price),
        image_url: state.image_url,
        amazon_url: state.amazon_url,
        rating: state.rating === "" ? null : Number(state.rating),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");

      const payload = {
        ...parsed.data,
        brand: parsed.data.brand || null,
        image_url: parsed.data.image_url || null,
        featured: state.featured,
        pros: toLines(state.pros),
        cons: toLines(state.cons),
        updated_at: new Date().toISOString(),
      };

      let productId = state.id;
      if (productId) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
      }

      await supabase.from("product_specs").delete().eq("product_id", productId);
      const specRows = toLines(state.specs)
        .map((line, index) => {
          const [label, ...rest] = line.split(":");
          const value = rest.join(":").trim();
          if (!label || !value) return null;
          return { product_id: productId, label: label.trim(), value, position: index + 1 };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
      if (specRows.length > 0) {
        const { error } = await supabase.from("product_specs").insert(specRows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Producto guardado");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveTag = useMutation({
    mutationFn: async (value: string) => {
      const clean = value.trim().slice(0, 60);
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "amazon_affiliate_tag", value: clean, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tag de afiliado actualizado");
      queryClient.invalidateQueries({ queryKey: ["affiliate-tag"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function editProduct(product: ProductWithSpecs) {
    setForm({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand ?? "",
      category_id: product.category_id ?? "",
      short_description: product.short_description,
      description: product.description,
      price: product.price?.toString() ?? "",
      image_url: product.image_url ?? "",
      amazon_url: product.amazon_url,
      rating: product.rating?.toString() ?? "",
      featured: product.featured,
      pros: product.pros.join("\n"),
      cons: product.cons.join("\n"),
      specs: [...product.product_specs]
        .sort((a, b) => a.position - b.position)
        .map((spec) => `${spec.label}: ${spec.value}`)
        .join("\n"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return <p className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">Cargando…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Necesitas iniciar sesión</h1>
        <Button asChild className="mt-6">
          <Link to="/auth">Ir al acceso</Link>
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Sin permisos de administrador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu cuenta ({session.user.email}) no tiene el rol de administrador asignado.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={async () => {
              const { data, error } = await supabase.rpc("claim_first_admin");
              if (error) {
                toast.error(error.message);
                return;
              }
              if (data) {
                toast.success("Ahora eres administrador. Recargando…");
                window.location.reload();
              } else {
                toast.error("Ya existe un administrador en este sitio.");
              }
            }}
          >
            Reclamar rol de administrador
          </Button>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </Button>
        </div>

      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Panel de administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Tag de afiliado de Amazon</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se añade automáticamente a todos los enlaces de compra (?tag=…).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="mitienda-21"
            maxLength={60}
            className="sm:max-w-xs"
          />
          <Button onClick={() => saveTag.mutate(tag)} disabled={saveTag.isPending}>
            Guardar tag
          </Button>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">
          {form.id ? "Editar producto" : "Nuevo producto"}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={120}
            />
          </Field>
          <Field label="Slug (URL)">
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="auriculares-anc-pro"
              maxLength={80}
            />
          </Field>
          <Field label="Marca">
            <Input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              maxLength={80}
            />
          </Field>
          <Field label="Categoría">
            <Select
              {...(form.category_id ? { value: form.category_id } : {})}
              onValueChange={(value) => setForm({ ...form, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Precio (EUR)">
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <Field label="Valoración (0-5)">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
            />
          </Field>
          <Field label="URL de la imagen">
            <Input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              maxLength={500}
            />
          </Field>
          <Field label="URL del producto en Amazon">
            <Input
              value={form.amazon_url}
              onChange={(e) => setForm({ ...form, amazon_url: e.target.value })}
              placeholder="https://www.amazon.es/dp/XXXXXXXX"
              maxLength={500}
            />
          </Field>
          <Field label="Descripción corta" className="sm:col-span-2">
            <Input
              value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              maxLength={200}
            />
          </Field>
          <Field label="Análisis completo" className="sm:col-span-2">
            <Textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={5000}
            />
          </Field>
          <Field label="Pros (uno por línea)">
            <Textarea
              rows={4}
              value={form.pros}
              onChange={(e) => setForm({ ...form, pros: e.target.value })}
            />
          </Field>
          <Field label="Contras (uno por línea)">
            <Textarea
              rows={4}
              value={form.cons}
              onChange={(e) => setForm({ ...form, cons: e.target.value })}
            />
          </Field>
          <Field label="Ficha técnica (una por línea: Etiqueta: valor)" className="sm:col-span-2">
            <Textarea
              rows={6}
              value={form.specs}
              onChange={(e) => setForm({ ...form, specs: e.target.value })}
              placeholder={"Pantalla: 14\" OLED\nBatería: 40 h"}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="size-4 accent-current"
          />
          Destacar en la portada
        </label>

        <div className="mt-6 flex gap-3">
          <Button onClick={() => saveProduct.mutate(form)} disabled={saveProduct.isPending}>
            {form.id ? "Guardar cambios" : "Crear producto"}
          </Button>
          {form.id ? (
            <Button variant="outline" onClick={() => setForm(emptyForm)}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Productos ({products?.length ?? 0})</h2>
        <div className="mt-4 space-y-3">
          {(products ?? []).map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.categories?.name ?? "Sin categoría"} ·{" "}
                  {formatPrice(product.price, product.currency)} · {product.product_specs.length}{" "}
                  specs
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => editProduct(product)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeProduct.mutate(product.id)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
