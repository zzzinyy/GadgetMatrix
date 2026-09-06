import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { ProductWithSpecs } from "@/lib/catalog";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  published: boolean;
  published_at: string;
};

export type TopList = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover_image_url: string | null;
  published: boolean;
  position: number;
};

export type TopListItem = {
  id: string;
  list_id: string;
  product_id: string;
  position: number;
  note: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
};

export type PricePoint = {
  product_id: string;
  price: number;
  recorded_at: string;
};

export const blogPostsQuery = queryOptions({
  queryKey: ["blog-posts"],
  queryFn: async (): Promise<BlogPost[]> => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, content, cover_image_url, tags, published, published_at")
      .order("published_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BlogPost[];
  },
});

export function blogPostQuery(slug: string) {
  return queryOptions({
    queryKey: ["blog-post", slug],
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, content, cover_image_url, tags, published, published_at")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as BlogPost) ?? null;
    },
  });
}

export const topListsQuery = queryOptions({
  queryKey: ["top-lists"],
  queryFn: async (): Promise<(TopList & { top_list_items: TopListItem[] })[]> => {
    const { data, error } = await supabase
      .from("top_lists")
      .select("*, top_list_items(id, list_id, product_id, position, note)")
      .order("position");
    if (error) throw error;
    return (data ?? []) as unknown as (TopList & { top_list_items: TopListItem[] })[];
  },
});

export function reviewsQuery(productId: string | null) {
  return queryOptions({
    queryKey: ["reviews", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<Review[]> => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
}

export const allReviewsQuery = queryOptions({
  queryKey: ["reviews", "all"],
  queryFn: async (): Promise<Review[]> => {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as Review[];
  },
});

export const priceHistoryQuery = queryOptions({
  queryKey: ["price-history"],
  queryFn: async (): Promise<PricePoint[]> => {
    const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("price_history")
      .select("product_id, price, recorded_at")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true })
      .limit(5000);
    if (error) throw error;
    return (data ?? []).map((row) => ({ ...row, price: Number(row.price) })) as PricePoint[];
  },
});

export type Deal = {
  product: ProductWithSpecs;
  previousPrice: number;
  currentPrice: number;
  discount: number;
};

/** Calcula bajadas de precio comparando el precio actual con el máximo histórico reciente. */
export function buildDeals(products: ProductWithSpecs[], history: PricePoint[]): Deal[] {
  const byProduct = new Map<string, number[]>();
  for (const point of history) {
    const list = byProduct.get(point.product_id) ?? [];
    list.push(point.price);
    byProduct.set(point.product_id, list);
  }
  const deals: Deal[] = [];
  for (const product of products) {
    const current = product.price;
    if (current == null) continue;
    const prices = byProduct.get(product.id) ?? [];
    const max = Math.max(current, ...prices);
    if (max > current) {
      deals.push({
        product,
        previousPrice: max,
        currentPrice: current,
        discount: Math.round(((max - current) / max) * 100),
      });
    }
  }
  return deals.sort((a, b) => b.discount - a.discount);
}
