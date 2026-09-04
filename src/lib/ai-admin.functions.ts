import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export type AiMessage = z.infer<typeof messageSchema>;

const SYSTEM_PROMPT = `Eres el copiloto de administración de GadgetMatrix, una web española de afiliados de Amazon sobre gadgets.
Puedes trabajar directamente sobre la base de datos del sitio usando las herramientas disponibles: crear y editar productos con su ficha técnica, categorías, artículos del blog, listas "Top" y ajustes del sitio.
Reglas:
- Responde siempre en español, de forma breve y concreta.
- Antes de crear un producto o lista, consulta el catálogo con list_catalog si necesitas saber qué existe.
- Los slugs van en minúsculas, sin acentos y con guiones.
- Escribe textos de marketing útiles y honestos: descripción corta (<200 caracteres), análisis de 2-3 párrafos, 3-5 pros y 2-4 contras, y 5-8 especificaciones técnicas realistas.
- Nunca inventes URLs de Amazon: si el usuario no da una, usa https://www.amazon.es/s?k=<nombre+del+producto>.
- Puedes actualizar precios (set_product_price), borrar contenidos (delete_content) y consultar las estadísticas de la web (get_analytics) si el usuario lo pide.
- Cuando termines, resume en una lista lo que has hecho.`;

const tools = [
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


type ToolResult = { ok: boolean; detail: string; data?: unknown };

export const runAdminAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ reply: string; actions: string[] }> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error("No se pudo verificar el rol de administrador.");
    if (!isAdmin) throw new Error("Solo los administradores pueden usar el copiloto.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta la configuración de la IA.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
          const categoryId = await categoryIdFor(args["category_slug"] as string | undefined);
          const payload: Record<string, unknown> = {
            slug,
            name: String(args["name"]),
            brand: (args["brand"] as string) ?? null,
            short_description: (args["short_description"] as string) ?? "",
            description: (args["description"] as string) ?? "",
            price: args["price"] == null ? null : Number(args["price"]),
            image_url: (args["image_url"] as string) ?? null,
            amazon_url:
              (args["amazon_url"] as string) ??
              `https://www.amazon.es/s?k=${encodeURIComponent(String(args["name"]))}`,
            rating: args["rating"] == null ? null : Number(args["rating"]),
            featured: Boolean(args["featured"] ?? false),
            pros: (args["pros"] as string[]) ?? [],
            cons: (args["cons"] as string[]) ?? [],
            updated_at: new Date().toISOString(),
          };
          if (categoryId) payload["category_id"] = categoryId;

          const { data: product, error } = await supabaseAdmin
            .from("products")
            .upsert(payload as never, { onConflict: "slug" })
            .select("id")
            .single();
          if (error) return { ok: false, detail: error.message };

          const specs = (args["specs"] as { label: string; value: string }[] | undefined) ?? [];
          if (specs.length > 0) {
            await supabaseAdmin.from("product_specs").delete().eq("product_id", product.id);
            await supabaseAdmin.from("product_specs").insert(
              specs.map((spec, index) => ({
                product_id: product.id,
                label: spec.label,
                value: spec.value,
                position: index + 1,
              })),
            );
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
              description: (args["description"] as string) ?? null,
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
              excerpt: (args["excerpt"] as string) ?? "",
              content: String(args["content"]),
              cover_image_url: (args["cover_image_url"] as string) ?? null,
              tags: (args["tags"] as string[]) ?? [],
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
                subtitle: (args["subtitle"] as string) ?? "",
                description: (args["description"] as string) ?? "",
                published: true,
              },
              { onConflict: "slug" },
            )
            .select("id")
            .single();
          if (error) return { ok: false, detail: error.message };

          const items = (args["items"] as { product_slug: string; note?: string }[]) ?? [];
          await supabaseAdmin.from("top_list_items").delete().eq("list_id", list.id);
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
                note: item.note ?? "",
              });
            }
          }
          if (rows.length > 0) await supabaseAdmin.from("top_list_items").insert(rows);
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
          const names = new Map((products ?? []).map((p) => [p.id, p.name]));
          const summary: Record<string, Record<string, number>> = {};
          for (const event of events ?? []) {
            const key = names.get(event.product_id ?? "") ?? "otros";
            summary[key] = summary[key] ?? {};
            summary[key]![event.event_type] = (summary[key]![event.event_type] ?? 0) + 1;
          }
          return { ok: true, detail: `analíticas de ${days} días`, data: summary };
        }

        default:
          return { ok: false, detail: `herramienta desconocida: ${name}` };
      }
    }

    type ChatMessage = Record<string, unknown>;
    const conversation: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let reply = "";
    for (let step = 0; step < 8; step++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
  });
