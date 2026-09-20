import type { ProductWithSpecs } from "@/lib/catalog";
import type { BlogPost, TopList } from "@/lib/content";

/**
 * Normaliza para la búsqueda: minúsculas, sin tildes ni diéresis y con los
 * espacios colapsados. Así "Auriculares" coincide con "auricular" y "movil"
 * con "móvil".
 */
export function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parte la consulta en tokens útiles (sin palabras vacías como "de" o "la"). */
export function queryTokens(query: string): string[] {
  return normalizeQuery(query)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

/** Artículos, preposiciones y conjunciones que no aportan a la búsqueda. */
const STOPWORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "del",
  "al",
  "una",
  "unos",
  "unas",
  "con",
  "por",
  "para",
  "como",
  "pero",
  "sus",
  "les",
  "más",
  "mas",
  "sin",
  "sobre",
  "este",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "esos",
  "esas",
  "aquí",
  "aqui",
  "ahí",
  "ahi",
  "allí",
  "alli",
  "donde",
  "cuando",
  "porque",
  "pues",
  "toda",
  "todo",
  "todos",
  "todas",
  "mucho",
  "mucha",
  "muchos",
  "muchas",
  "poco",
  "poca",
  "pocos",
  "pocas",
]);

function fieldMatches(haystack: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const normalized = ` ${normalizeQuery(haystack)} `;
  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(` ${token}`)) score += 3;
    else if (normalized.includes(token)) score += 1;
    else return -1;
  }
  return score;
}

export type SearchKind = "product" | "post" | "list" | "page";

export type SearchResult = {
  kind: SearchKind;
  score: number;
  title: string;
  detail: string;
  /** Solo las páginas estáticas tienen ruta literal; el resto viaja por slug. */
  href?: string;
  slug?: string;
};

export function resultHref(result: SearchResult): string {
  if (result.href) return result.href;
  if (result.kind === "product") return `/producto/${result.slug}`;
  if (result.kind === "post") return `/blog/${result.slug}`;
  return `/top/${result.slug}`;
}

function resultKey(result: Pick<SearchResult, "kind" | "href" | "slug">): string {
  return result.href ?? `${result.kind}:${result.slug}`;
}

/** Peso por tipo: un producto vale más que una página estática. */
const KIND_WEIGHT: Record<SearchKind, number> = {
  product: 4,
  post: 3,
  list: 3,
  page: 1,
};

/** Páginas estáticas del sitio que el buscador también ofrece. */
export const STATIC_PAGES: Array<{
  title: string;
  detail: string;
  href: string;
  keywords: string;
}> = [
  {
    title: "Inicio",
    detail: "Portada de GadgetMatrix",
    href: "/",
    keywords: "inicio home portada",
  },
  {
    title: "Productos",
    detail: "Catálogo completo",
    href: "/productos",
    keywords: "catalogo productos gadgets",
  },
  {
    title: "Comparador",
    detail: "Compara dos productos",
    href: "/comparador",
    keywords: "comparador comparar versus",
  },
  {
    title: "Quiz",
    detail: "Encuentra tu gadget ideal",
    href: "/quiz",
    keywords: "quiz test recomendador",
  },
  {
    title: "Tops",
    detail: "Rankings por categoría",
    href: "/top",
    keywords: "tops rankings mejores",
  },
  {
    title: "Chollos",
    detail: "Bajadas de precio",
    href: "/chollos",
    keywords: "chollos ofertas descuentos baratos",
  },
  {
    title: "Blog",
    detail: "Análisis y guías",
    href: "/blog",
    keywords: "blog analisis guias noticias",
  },
  {
    title: "Sobre nosotros",
    detail: "Quiénes somos",
    href: "/sobre-nosotros",
    keywords: "nosotros contacto quienes",
  },
];

export function buildSearchIndex(input: {
  products?: ProductWithSpecs[] | null;
  posts?: BlogPost[] | null;
  lists?: TopList[] | null;
}): SearchResult[] {
  const results: SearchResult[] = [];
  for (const product of input.products ?? []) {
    results.push({
      kind: "product",
      score: 0,
      title: product.name,
      detail: product.brand ?? product.categories?.name ?? "Producto",
      slug: product.slug,
    });
  }
  for (const post of input.posts ?? []) {
    if (post.published === false) continue;
    results.push({
      kind: "post",
      score: 0,
      title: post.title,
      detail: post.excerpt || "Artículo del blog",
      slug: post.slug,
    });
  }
  for (const list of input.lists ?? []) {
    if (list.published === false) continue;
    results.push({
      kind: "list",
      score: 0,
      title: list.title,
      detail: list.subtitle || "Ranking",
      slug: list.slug,
    });
  }
  for (const page of STATIC_PAGES) {
    results.push({
      kind: "page",
      score: 0,
      title: page.title,
      detail: page.detail,
      href: page.href,
    });
  }
  return results;
}

function searchableText(result: SearchResult, lookup: Map<string, string>): string {
  const extra = lookup.get(resultKey(result)) ?? "";
  return `${result.title} ${result.detail} ${extra}`;
}

/**
 * Busca en el índice ya construido. Todos los tokens deben aparecer (AND) y
 * los resultados salen ordenados por relevancia y luego alfabéticamente.
 */
export function searchIndex(
  index: SearchResult[],
  lookup: Map<string, string>,
  query: string,
  limit = 8,
): SearchResult[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const scored: SearchResult[] = [];
  for (const result of index) {
    const match = fieldMatches(searchableText(result, lookup), tokens);
    if (match < 0) continue;
    scored.push({ ...result, score: match * 10 + KIND_WEIGHT[result.kind] });
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "es"));
  return scored.slice(0, Math.max(1, limit));
}

/** Texto extra (marca, descripción, etiquetas) sobre el que también se busca. */
export function buildLookup(input: {
  products?: ProductWithSpecs[] | null;
  posts?: BlogPost[] | null;
  lists?: TopList[] | null;
}): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const product of input.products ?? []) {
    lookup.set(
      `product:${product.slug}`,
      `${product.brand ?? ""} ${product.short_description} ${product.categories?.name ?? ""}`,
    );
  }
  for (const post of input.posts ?? []) {
    lookup.set(`post:${post.slug}`, `${post.excerpt} ${(post.tags ?? []).join(" ")}`);
  }
  for (const list of input.lists ?? []) {
    lookup.set(`list:${list.slug}`, `${list.subtitle} ${list.description ?? ""}`);
  }
  for (const page of STATIC_PAGES) {
    lookup.set(page.href, page.keywords);
  }
  return lookup;
}
