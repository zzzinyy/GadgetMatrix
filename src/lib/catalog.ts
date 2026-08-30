import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type Spec = {
  id: string;
  label: string;
  value: string;
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category_id: string | null;
  short_description: string;
  description: string;
  price: number | null;
  currency: string;
  image_url: string | null;
  amazon_url: string;
  rating: number | null;
  pros: string[];
  cons: string[];
  featured: boolean;
  created_at: string;
};

export type ProductWithSpecs = Product & {
  categories: Pick<Category, "id" | "name" | "slug"> | null;
  product_specs: Spec[];
};

export function formatPrice(price: number | null, currency = "EUR") {
  if (price == null) return "Ver precio";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}

/** Añade el tag de afiliado de Amazon a la URL del producto. */
export function affiliateUrl(url: string, tag: string | null | undefined) {
  if (!tag) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("tag", tag);
    return parsed.toString();
  } catch {
    return url;
  }
}

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<ProductWithSpecs[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(id, name, slug), product_specs(id, label, value, position)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ProductWithSpecs[];
  },
});

export function productQuery(slug: string) {
  return queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<ProductWithSpecs | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(id, name, slug), product_specs(id, label, value, position)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ProductWithSpecs) ?? null;
    },
  });
}

export const affiliateTagQuery = queryOptions({
  queryKey: ["affiliate-tag"],
  queryFn: async (): Promise<string> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "amazon_affiliate_tag")
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? "";
  },
});
