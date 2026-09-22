import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, House, ListOrdered, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { blogPostsQuery, topListsQuery } from "@/lib/content";
import { useT } from "@/hooks/useT";
import {
  buildLookup,
  buildSearchIndex,
  resultHref,
  searchIndex,
  type SearchKind,
  type SearchResult,
} from "@/lib/search";

const KIND_LABEL_KEY = {
  product: "products",
  post: "posts",
  list: "lists",
  page: "pages",
} as const satisfies Record<SearchKind, "products" | "posts" | "lists" | "pages">;

const KIND_ICON: Record<SearchKind, typeof Search> = {
  product: ShoppingBag,
  post: FileText,
  list: ListOrdered,
  page: House,
};

function categoryName(product: SearchResult, categories: Map<string, string>): string | null {
  if (product.kind !== "product" || !product.slug) return null;
  return categories.get(product.slug) ?? null;
}

/** Buscador global (Ctrl/⌘+K): productos, artículos, tops y páginas. */
export function GlobalSearch() {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const { data: products } = useQuery(productsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const { data: posts } = useQuery(blogPostsQuery);
  const { data: lists } = useQuery(topListsQuery);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const index = useMemo(
    () => buildSearchIndex({ products, posts, lists }),
    [products, posts, lists],
  );
  const lookup = useMemo(() => buildLookup({ products, posts, lists }), [products, posts, lists]);
  const categoriesBySlug = useMemo(() => {
    const byId = new Map((categories ?? []).map((category) => [category.id, category.name]));
    const bySlug = new Map<string, string>();
    for (const product of products ?? []) {
      const name =
        product.categories?.name ??
        (product.category_id ? byId.get(product.category_id) : undefined);
      if (name) bySlug.set(product.slug, name);
    }
    return bySlug;
  }, [categories, products]);
  const results = useMemo(() => searchIndex(index, lookup, term, 8), [index, lookup, term]);

  const groups = useMemo(() => {
    const ordered: Array<{ kind: SearchKind; items: SearchResult[] }> = [];
    for (const result of results) {
      const group = ordered.find((entry) => entry.kind === result.kind);
      if (group) group.items.push(result);
      else ordered.push({ kind: result.kind, items: [result] });
    }
    return ordered;
  }, [results]);

  function go(href: string) {
    setOpen(false);
    setTerm("");
    void navigate({ to: href });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={tr("search", "buttonLabel")}
        className="gap-2 text-muted-foreground"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden md:inline">{tr("search", "button")}</span>
        <kbd className="hidden rounded border border-border bg-surface px-1.5 text-[10px] font-medium lg:inline">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} aria-label={tr("search", "dialogLabel")}>
        <Command shouldFilter={false} aria-label={tr("search", "commandLabel")}>
          <CommandInput
            placeholder={tr("search", "placeholder")}
            value={term}
            onValueChange={setTerm}
            aria-label={tr("search", "inputLabel")}
          />
          <CommandList>
            <CommandEmpty>
              {term.trim() ? tr("search", "noResultsFor").replace("{term}", term.trim()) : tr("search", "empty")}
            </CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.kind} heading={tr("searchGroups", KIND_LABEL_KEY[group.kind])}>
                {group.items.map((result) => {
                  const Icon = KIND_ICON[result.kind];
                  const key = result.href ?? `${result.kind}:${result.slug}`;
                  const href = resultHref(result);
                  const category = categoryName(result, categoriesBySlug);
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={() => go(href)}
                      className="flex items-center gap-3"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {result.kind === "product" && result.slug ? (
                            <Link
                              to="/producto/$slug"
                              params={{ slug: result.slug }}
                              onClick={(event) => {
                                event.preventDefault();
                                go(href);
                              }}
                            >
                              {result.title}
                            </Link>
                          ) : (
                            result.title
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {category ? `${category} · ` : ""}
                          {result.detail}
                        </span>
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
          <span role="status" aria-live="polite" className="sr-only">
            {term.trim() ? groups.reduce((n, g) => n + g.items.length, 0) : ""}
          </span>
        </Command>
      </CommandDialog>
    </>
  );
}
