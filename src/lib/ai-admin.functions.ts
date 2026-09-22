import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callGroq } from "../../supabase/functions/_shared/groq.ts";

export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

export const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export type AiMessage = z.infer<typeof messageSchema>;

export const SYSTEM_PROMPT = `Eres el copiloto de administración de GadgetMatrix, una web española de afiliados de Amazon sobre gadgets.
Puedes trabajar directamente sobre la base de datos del sitio usando las herramientas disponibles: crear y editar productos con su ficha técnica, categorías, artículos del blog, listas "Top" y ajustes del sitio.
Reglas:
- Responde siempre en español, de forma breve y concreta.
- Antes de crear un producto o lista, consulta el catálogo con list_catalog si necesitas saber qué existe.
- Los slugs van en minúsculas, sin acentos y con guiones.
- Escribe textos de marketing útiles y honestos: descripción corta (<200 caracteres), análisis de 2-3 párrafos, 3-5 pros y 2-4 contras, y 5-8 especificaciones técnicas realistas.
- Nunca inventes URLs de Amazon: si el usuario no da una, usa https://www.amazon.es/s?k=<nombre+del+producto>.
- Puedes actualizar precios (set_product_price), borrar contenidos (delete_content) y consultar las estadísticas de la web (get_analytics) si el usuario lo pide.
- Cuando termines, resume en una lista lo que has hecho.`;

export const tools = [
  {
    type: "function",
    function: {
      name: "list_catalog",
      description: "Lista productos, categorías, artículos del blog y listas Top existentes.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_product",
      description: "Crea o actualiza un producto del catálogo (por slug), con specs, pros y contras.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          name: { type: "string" },
          brand: { type: "string" },
          category_slug: { type: "string" },
          short_description: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          image_url: { type: "string" },
          amazon_url: { type: "string" },
          rating: { type: "number" },
          featured: { type: "boolean" },
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },
          specs: {
            type: "array",
            items: {
              type: "object",
              properties: { label: { type: "string" }, value: { type: "string" } },
              required: ["label", "value"],
            },
          },
        },
        required: ["slug", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_product",
      description: "Elimina un producto por slug.",
      parameters: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_category",
      description: "Crea o actualiza una categoría.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["slug", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_blog_post",
      description: "Crea o actualiza un artículo del blog (contenido en Markdown sencillo).",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          excerpt: { type: "string" },
          content: { type: "string" },
          cover_image_url: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          published: { type: "boolean" },
        },
        required: ["slug", "title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_top_list",
      description: "Crea o actualiza una lista Top con productos ordenados (por slug de producto).",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          description: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_slug: { type: "string" },
                note: { type: "string" },
              },
              required: ["product_slug"],
            },
          },
        },
        required: ["slug", "title", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_setting",
      description: "Guarda un ajuste del sitio (por ejemplo amazon_affiliate_tag).",
      parameters: {
        type: "object",
        properties: { key: { type: "string" }, value: { type: "string" } },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_product_price",
      description:
        "Actualiza el precio de un producto por slug (queda registrado en el histórico de precios y puede generar chollos).",
      parameters: {
        type: "object",
        properties: { slug: { type: "string" }, price: { type: "number" } },
        required: ["slug", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_content",
      description: "Elimina un artículo del blog o una lista Top por slug.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["blog_post", "top_list", "category"] },
          slug: { type: "string" },
        },
        required: ["kind", "slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_analytics",
      description:
        "Resumen de interacciones de los últimos días: visitas, clics en tarjetas y clics de afiliado por producto.",
      parameters: {
        type: "object",
        properties: { days: { type: "number" } },
      },
    },
  },
] as const;

export type ToolResult = { ok: boolean; detail: string; data?: unknown };

/** Tabla mínima: el subconjunto de supabase-js que usan las herramientas. */
export type AdminTable = {
  select: (cols: string) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>;
} & {
  // Las variantes encadenadas se modelan por separado donde se usan.
  [key: string]: any;
};

export type AdminDb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: { message: string } | null }>;
};

export const runAdminAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ reply: string; actions: string[] }> => {
    const adminCheck = (await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never)) as unknown as { data: boolean | null; error: { message: string } | null };
    if (adminCheck.error) throw new Error("No se pudo verificar el rol de administrador.");
    if (!adminCheck.data) throw new Error("Solo los administradores pueden usar el copiloto.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta la configuración de la IA.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return runAgentWith(supabaseAdmin as unknown as AdminDb, apiKey, fetch, data.messages);
  });

/* ------------------------------------------------------------------ */
/* Lógica compartida (sin imports de servidor): la Edge Function       */
/* supabase/functions/admin-agent la importa desde aquí.               */
/* ------------------------------------------------------------------ */

type ChatMessage = Record<string, unknown>;

export type AgentDeps = {
  supabaseAdmin: AdminDb;
  apiKey: string;
  /** Clave opcional de la reserva Groq (fallback si el gateway agota cuota). */
  groqApiKey?: string;
  fetchImpl?: typeof fetch;
};

export async function runAgentCore(
  deps: AgentDeps,
  messages: AiMessage[],
): Promise<{ reply: string; actions: string[] }> {
  return runAgentWith(
    deps.supabaseAdmin,
    deps.apiKey,
    deps.fetchImpl ?? fetch,
    messages,
    deps.groqApiKey,
  );
}

async function runAgentWith(
  supabaseAdmin: AdminDb,
  apiKey: string,
  fetchImpl: typeof fetch,
  messages: AiMessage[],
  groqApiKey?: string,
): Promise<{ reply: string; actions: string[] }> {
  const actions: string[] = [];

  async function categoryIdFor(slug?: string): Promise<string | null> {
      if (!slug) return null;
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (cat) return cat.id;
      const { data: created } = await supabaseAdmin
        .from("categories")
        .insert({ slug, name: slug.replace(/-/g, " ") })
        .select("id")
        .single();
      return created?.id ?? null;
    }

    async function runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
      switch (name) {
        case "list_catalog": {
          const [products, categories, posts, lists] = await Promise.all([
            supabaseAdmin.from("products").select("slug, name, brand, price, rating, featured"),
            supabaseAdmin.from("categories").select("slug, name"),
            supabaseAdmin.from("blog_posts").select("slug, title, published"),
            supabaseAdmin.from("top_lists").select("slug, title"),
          ]);
          return {
            ok: true,
            detail: "catálogo leído",
            data: {
              products: products.data ?? [],
              categories: categories.data ?? [],
              posts: posts.data ?? [],
              top_lists: lists.data ?? [],
            },
          };
        }
        case "upsert_product": {
          const slug = String(args["slug"]);
          const categorySlug =
            typeof args["category_slug"] === "string" ? args["category_slug"] : undefined;
          const stringList = (value: unknown): string[] =>
            Array.isArray(value)
              ? value.filter((entry): entry is string => typeof entry === "string")
              : [];
          const categoryId = await categoryIdFor(categorySlug);
          const payload: Record<string, unknown> = {
            slug,
            name: String(args["name"]),
            brand: typeof args["brand"] === "string" ? args["brand"] : null,
            short_description:
              typeof args["short_description"] === "string" ? args["short_description"] : "",
            description: typeof args["description"] === "string" ? args["description"] : "",
            price: args["price"] == null ? null : Number(args["price"]),
            image_url: typeof args["image_url"] === "string" ? args["image_url"] : null,
            amazon_url:
              typeof args["amazon_url"] === "string" && args["amazon_url"]
                ? args["amazon_url"]
                : `https://www.amazon.es/s?k=${encodeURIComponent(String(args["name"]))}`,
            rating: args["rating"] == null ? null : Number(args["rating"]),
            featured: Boolean(args["featured"] ?? false),
            pros: stringList(args["pros"]),
            cons: stringList(args["cons"]),
            updated_at: new Date().toISOString(),
          };
          if (categoryId) payload["category_id"] = categoryId;

          const { data: product, error } = await supabaseAdmin
            .from("products")
            .upsert(payload as never, { onConflict: "slug" })
            .select("id")
            .single();
          if (error) return { ok: false, detail: error.message };

          const rawSpecs = Array.isArray(args["specs"]) ? args["specs"] : [];
          const specs = rawSpecs.filter(
            (spec): spec is { label: string; value: string } =>
              typeof spec === "object" &&
              spec !== null &&
              "label" in spec &&
              "value" in spec &&
              typeof (spec as { label: unknown }).label === "string" &&
              typeof (spec as { value: unknown }).value === "string",
          );
          const { error: deleteSpecsError } = await supabaseAdmin
            .from("product_specs")
            .delete()
            .eq("product_id", product.id);
          if (deleteSpecsError) return { ok: false, detail: deleteSpecsError.message };
          if (specs.length > 0) {
            const { error: insertSpecsError } = await supabaseAdmin.from("product_specs").insert(
              specs.map((spec, index) => ({
                product_id: product.id,
                label: spec.label,
                value: spec.value,
                position: index + 1,
              })),
            );
            if (insertSpecsError) return { ok: false, detail: insertSpecsError.message };
          }
          actions.push(`Producto guardado: ${slug}`);
          return { ok: true, detail: `producto ${slug} guardado` };
        }
        case "delete_product": {
          const slug = String(args["slug"]);
          const { error } = await supabaseAdmin.from("products").delete().eq("slug", slug);
          if (error) return { ok: false, detail: error.message };
          actions.push(`Producto eliminado: ${slug}`);
          return { ok: true, detail: `producto ${slug} eliminado` };
        }
        case "upsert_category": {
          const { error } = await supabaseAdmin.from("categories").upsert(
            {
              slug: String(args["slug"]),
              name: String(args["name"]),
              description:
                typeof args["description"] === "string" ? args["description"] : null,
            },
            { onConflict: "slug" },
          );
          if (error) return { ok: false, detail: error.message };
          actions.push(`Categoría guardada: ${String(args["slug"])}`);
          return { ok: true, detail: "categoría guardada" };
        }
        case "upsert_blog_post": {
          const { error } = await supabaseAdmin.from("blog_posts").upsert(
            {
              slug: String(args["slug"]),
              title: String(args["title"]),
              excerpt: typeof args["excerpt"] === "string" ? args["excerpt"] : "",
              content: String(args["content"]),
              cover_image_url:
                typeof args["cover_image_url"] === "string" ? args["cover_image_url"] : null,
              tags: Array.isArray(args["tags"])
                ? args["tags"].filter((tag): tag is string => typeof tag === "string")
                : [],
              published: args["published"] == null ? true : Boolean(args["published"]),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "slug" },
          );
          if (error) return { ok: false, detail: error.message };
          actions.push(`Artículo guardado: ${String(args["slug"])}`);
          return { ok: true, detail: "artículo guardado" };
        }
        case "upsert_top_list": {
          const { data: list, error } = await supabaseAdmin
            .from("top_lists")
            .upsert(
              {
                slug: String(args["slug"]),
                title: String(args["title"]),
                subtitle: typeof args["subtitle"] === "string" ? args["subtitle"] : "",
                description: typeof args["description"] === "string" ? args["description"] : "",
                published: true,
              },
              { onConflict: "slug" },
            )
            .select("id")
            .single();
          if (error) return { ok: false, detail: error.message };

          const rawItems = Array.isArray(args["items"]) ? args["items"] : [];
          const items = rawItems.filter(
            (item): item is { product_slug: string; note?: string } =>
              typeof item === "object" && item !== null && "product_slug" in item,
          );
          const { error: deleteItemsError } = await supabaseAdmin
            .from("top_list_items")
            .delete()
            .eq("list_id", list.id);
          if (deleteItemsError) return { ok: false, detail: deleteItemsError.message };
          const rows: { list_id: string; product_id: string; position: number; note: string }[] = [];
          for (const [index, item] of items.entries()) {
            const { data: product } = await supabaseAdmin
              .from("products")
              .select("id")
              .eq("slug", item.product_slug)
              .maybeSingle();
            if (product) {
              rows.push({
                list_id: list.id,
                product_id: product.id,
                position: index + 1,
                note: typeof item.note === "string" ? item.note : "",
              });
            }
          }
          if (rows.length > 0) {
            const { error: insertItemsError } = await supabaseAdmin
              .from("top_list_items")
              .insert(rows);
            if (insertItemsError) return { ok: false, detail: insertItemsError.message };
          }
          actions.push(`Lista Top guardada: ${String(args["slug"])} (${rows.length} productos)`);
          return { ok: true, detail: `lista guardada con ${rows.length} productos` };
        }
        case "set_setting": {
          const { error } = await supabaseAdmin.from("site_settings").upsert({
            key: String(args["key"]),
            value: String(args["value"]),
            updated_at: new Date().toISOString(),
          });
          if (error) return { ok: false, detail: error.message };
          actions.push(`Ajuste actualizado: ${String(args["key"])}`);
          return { ok: true, detail: "ajuste guardado" };
        }
        case "set_product_price": {
          const slug = String(args["slug"]);
          const price = Number(args["price"]);
          const { error } = await supabaseAdmin
            .from("products")
            .update({ price, updated_at: new Date().toISOString() })
            .eq("slug", slug);
          if (error) return { ok: false, detail: error.message };
          actions.push(`Precio actualizado: ${slug} → ${price}`);
          return { ok: true, detail: `precio de ${slug} actualizado` };
        }
        case "delete_content": {
          const kind = String(args["kind"]);
          const slug = String(args["slug"]);
          const table =
            kind === "blog_post" ? "blog_posts" : kind === "top_list" ? "top_lists" : "categories";
          const { error } = await supabaseAdmin.from(table).delete().eq("slug", slug);
          if (error) return { ok: false, detail: error.message };
          actions.push(`Eliminado (${kind}): ${slug}`);
          return { ok: true, detail: `${kind} ${slug} eliminado` };
        }
        case "get_analytics": {
          const days = Number(args["days"] ?? 30);
          const since = new Date(Date.now() - days * 86400000).toISOString();
          const [{ data: events }, { data: products }] = await Promise.all([
            supabaseAdmin
              .from("product_events")
              .select("product_id, event_type")
              .gte("created_at", since),
            supabaseAdmin.from("products").select("id, name, slug"),
          ]);
          const names = new Map<string, string>(
            ((products ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
          );
          const summary: Record<string, Record<string, number>> = {};
          for (const event of (events ?? []) as { product_id?: string | null; event_type: string }[]) {
            const key = names.get(event.product_id ?? "") ?? "otros";
            const bucket = (summary[key] ??= {});
            bucket[event.event_type] = (bucket[event.event_type] ?? 0) + 1;
          }
          return { ok: true, detail: `analíticas de ${days} días`, data: summary };
        }

        default:
          return { ok: false, detail: `herramienta desconocida: ${name}` };
      }
    }

    const conversation: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let reply = "";
    for (let step = 0; step < 8; step++) {
      const response = await fetchImpl("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.7-flash",
          messages: conversation,
          tools,
        }),
      });

      // Cuota o créditos agotados en el gateway: intenta la reserva Groq
      // (respuesta directa sin herramientas, mejor que fallar del todo).
      if (response.status === 429 || response.status === 402) {
        const fallback = groqApiKey
          ? await callGroq({
              apiKey: groqApiKey,
              messages: conversation.filter(
                (m): m is { role: "system" | "user" | "assistant"; content: string } =>
                  (m.role === "system" || m.role === "user" || m.role === "assistant") &&
                  typeof m.content === "string" &&
                  m.content.trim().length > 0,
              ),
            })
          : { ok: false as const, text: "" };
        if (fallback.ok && fallback.text.trim()) {
          actions.push("(Reserva Groq: respuesta sin herramientas)");
          return { reply: fallback.text, actions };
        }
      }

      if (response.status === 429) throw new Error("Límite de peticiones alcanzado, inténtalo en un minuto.");
      if (response.status === 402) throw new Error("Se han agotado los créditos de IA del proyecto.");
      if (!response.ok) {
        const text = await response.text();
        console.error("AI gateway error", response.status, text);
        throw new Error("La IA no ha podido responder.");
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
      };
      const message = payload.choices?.[0]?.message;
      if (!message) throw new Error("Respuesta vacía de la IA.");

      const toolCalls = message.tool_calls ?? [];
      conversation.push({
        role: "assistant",
        content: message.content ?? "",
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });

      if (toolCalls.length === 0) {
        reply = message.content ?? "";
        break;
      }

      for (const call of toolCalls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          parsedArgs = {};
        }
        let result: ToolResult;
        try {
          result = await runTool(call.function.name, parsedArgs);
        } catch (error) {
          result = { ok: false, detail: error instanceof Error ? error.message : "error" };
        }
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 12000),
        });
      }
    }

    return { reply: reply || "Listo.", actions };
}
