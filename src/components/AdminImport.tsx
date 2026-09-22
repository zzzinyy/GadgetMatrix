import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesQuery } from "@/lib/catalog";

type ProductInsert = TablesInsert<"products">;
type PostInsert = TablesInsert<"blog_posts">;
type PriceInsert = TablesInsert<"price_history">;

type TargetId = "products" | "posts" | "prices";

const TARGETS: { id: TargetId; label: string; hint: string }[] = [
  {
    id: "products",
    label: "Productos",
    hint: "Crea o actualiza productos por slug, con marca, categoría, precio, moneda, valoración, imagen, enlace de Amazon, descripciones, pros, contras y ficha técnica. Al reimportar el mismo slug se actualiza, no se duplica.",
  },
  {
    id: "posts",
    label: "Artículos del blog",
    hint: "Crea o actualiza artículos por slug.",
  },
  {
    id: "prices",
    label: "Histórico de precios",
    hint: "Añade puntos a price_history. Alimenta los chollos automáticos de la web.",
  },
];

/**
 * Columnas que reconoce cada destino. Se muestran en la interfaz para que no haya
 * que adivinar los nombres de cabecera.
 */
const COLUMN_DOCS: Record<TargetId, { name: string; required: boolean; note?: string }[]> = {
  products: [
    { name: "Nombre", required: true, note: "nombre comercial del producto" },
    {
      name: "Slug",
      required: true,
      note: "identificador único: solo minúsculas, números y guiones",
    },
    { name: "Categoría", required: false, note: "nombre o slug de una categoría existente" },
    { name: "Marca", required: false },
    { name: "Valoración", required: false, note: "de 0 a 5" },
    { name: "Precio (EUR)", required: false, note: "acepta 899,99 o 899.99" },
    { name: "Moneda", required: false, note: "por defecto EUR" },
    { name: "URL de imagen", required: false, note: "enlace directo a la foto" },
    {
      name: "URL de producto en Amazon",
      required: true,
      note: "aquí se añade automáticamente tu tag de afiliado",
    },
    {
      name: "Descripción corta",
      required: false,
      note: "máx. 200 caracteres, aparece en la tarjeta",
    },
    { name: "Análisis completo", required: false, note: "máx. 5000 caracteres" },
    { name: "Pros", required: false, note: "separa con | (barra vertical)" },
    { name: "Contras", required: false, note: "separa con | (barra vertical)" },
    { name: "Ficha técnica", required: false, note: "Etiqueta:valor separados con |" },
    { name: "Destacado", required: false, note: "si/no, lo marca como recomendado en portada" },
  ],
  posts: [
    { name: "Slug", required: true, note: "identificador único del artículo" },
    { name: "Título", required: true },
    { name: "Resumen", required: false, note: "máx. 400 caracteres" },
    { name: "Contenido", required: false, note: "admite HTML" },
    { name: "Portada", required: false, note: "URL de la imagen de cabecera" },
    { name: "Etiquetas", required: false, note: "separa con | o con comas" },
    { name: "Publicado", required: false, note: "si/no; por defecto se publica" },
  ],
  prices: [
    { name: "Slug", required: true, note: "del producto que ya exista en el catálogo" },
    { name: "Precio", required: true, note: "precio observado ese día" },
    { name: "Fecha", required: false, note: "2026-01-15; si se omite, se usa la fecha actual" },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Plantillas descargables                                                    */
/* -------------------------------------------------------------------------- */

const TEMPLATES: Record<TargetId, string> = {
  products: [
    "Nombre,Slug,Categoría,Marca,Valoración,Precio (EUR),Moneda,URL de imagen,URL de producto en Amazon,Descripción corta,Análisis completo,Pros,Contras,Ficha técnica,Destacado",
    '"Portátil de Ejemplo","portatil-ejemplo","portatiles","MarcaX",4.5,899.99,EUR,https://images.example.com/portatil.jpg,https://www.amazon.es/dp/B0EXAMPLE,"Resumen corto que aparece en la tarjeta del producto","Análisis completo del producto: puedes escribir varias frases, con comas y todo, porque el campo va entre comillas.","Ligero|Buena autonomía|Pantalla OLED brillante","Se calienta con carga intensa|Precio elevado","Pantalla:14"" OLED|Batería:40 h|RAM:16 GB|SSD:512 GB",si',
  ].join("\n"),
  posts: [
    "slug,title,excerpt,content,cover_image_url,tags,published",
    "mejores-portatiles-2026,Los mejores portátiles de 2026,Resumen del artículo,<p>Texto completo del artículo</p>,https://images.example.com/portada.jpg,portatiles|guia,si",
  ].join("\n"),
  prices: ["slug,price,recorded_at", "portatil-ejemplo,849.99,2026-01-15"].join("\n"),
};

/* -------------------------------------------------------------------------- */
/*  Utilidades de parseo (puras, sin estado)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Normaliza una cabecera: quita acentos, pasa a minúsculas y convierte cualquier
 * signo de puntuación o espacio en un único guion bajo.
 * Así "URL de imagen", "url-imagen" y "URL_IMAGEN" acaban todas en "url_imagen".
 */
function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Detecta si el CSV viene separado por coma o por punto y coma (Excel español). */
function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;
  let inQuotes = false;
  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (char === ",") commas += 1;
      else if (char === ";") semicolons += 1;
      else if (char === "\t") tabs += 1;
    }
  }
  if (tabs > commas && tabs > semicolons) return "\t";
  return semicolons > commas ? ";" : ",";
}

/** Parser CSV que respeta comillas dobles, comas y saltos de línea internos. */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

type RawRecord = Record<string, unknown>;

type ParseResult = {
  records: RawRecord[];
  errors: string[];
  format: "csv" | "json" | "vacío";
};

function normalizeRecord(input: RawRecord): RawRecord {
  const output: RawRecord = {};
  for (const [key, value] of Object.entries(input)) {
    output[normalizeKey(key)] = value;
  }
  return output;
}

/** Acepta CSV, TSV o JSON y devuelve registros con claves normalizadas. */
function parseInput(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { records: [], errors: [], format: "vacío" };

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return {
        records: list.map((item) => normalizeRecord(item as RawRecord)),
        errors: [],
        format: "json",
      };
    } catch (error) {
      return {
        records: [],
        errors: [`JSON inválido: ${(error as Error).message}`],
        format: "json",
      };
    }
  }

  const delimiter = detectDelimiter(trimmed);
  const rows = parseDelimited(trimmed, delimiter);
  if (rows.length === 0) return { records: [], errors: [], format: "csv" };

  const headerRow = rows[0];
  const headers = headerRow.map((cell) => normalizeKey(cell));
  if (headers.every((header) => header === "")) {
    return {
      records: [],
      errors: ["La primera fila debe contener los nombres de columna."],
      format: "csv",
    };
  }

  const records: RawRecord[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const record: RawRecord = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cells[index] ?? "";
    });
    records.push(record);
  }
  return { records, errors: [], format: "csv" };
}

/**
 * Convierte un valor a número aceptando tanto el formato español (1.299,95)
 * como el inglés (1,299.95), que es lo que exporta Excel según el idioma.
 *
 * Reglas:
 *  - Si aparecen coma y punto, el que está más a la derecha es el decimal.
 *  - Si hay varios separadores iguales (1.234.567) son separadores de millares.
 *  - Un único separador con exactamente 3 dígitos detrás y una parte entera
 *    distinta de cero se lee como millar (1.299 -> 1299). Con cualquier otra
 *    cantidad de decimales se lee como decimal (849,99 -> 849.99).
 */
function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;
  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");
  const isThousandsPart = (part: string | undefined) =>
    part !== undefined && part !== "" && part !== "0" && /^\d{1,3}$/.test(part);

  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    normalized = body.replace(thousands, "").replace(decimal, ".");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separator = lastComma !== -1 ? "," : ".";
    const parts = body.split(separator);
    const looksLikeThousands =
      parts.length > 2 ||
      (parts.length === 2 && isThousandsPart(parts[0]) && parts[1]?.length === 3);
    normalized = parts.join(looksLikeThousands ? "" : ".");
  } else {
    normalized = body;
  }

  const parsed = Number(negative ? `-${normalized}` : normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Convierte a ISO 8601 o devuelve null si la fecha no es válida. */
function toIso(value: string): string | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return ["1", "true", "si", "sí", "yes", "y", "x", "verdadero", "publicado"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value ?? "")
    .split(/[|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSpecs(value: unknown): { label: string; value: string }[] {
  const entries = Array.isArray(value) ? value.map((item) => String(item)) : parseList(value);
  const specs: { label: string; value: string }[] = [];
  for (const entry of entries) {
    const separator = entry.indexOf(":");
    if (separator === -1) continue;
    const label = entry.slice(0, separator).trim();
    const specValue = entry.slice(separator + 1).trim();
    if (!label || !specValue) continue;
    specs.push({ label, value: specValue });
  }
  return specs;
}

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

function downloadTemplate(target: TargetId) {
  const blob = new Blob([TEMPLATES[target]], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `plantilla-${target}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Lee la primera hoja de un .xlsx y la convierte en registros normalizados. */
function parseWorkbookRecords(buffer: ArrayBuffer): RawRecord[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  if (matrix.length === 0) return [];
  const headers = (matrix[0] as unknown[]).map((cell) => normalizeKey(String(cell)));
  const records: RawRecord[] = [];
  for (const cells of matrix.slice(1)) {
    const record: RawRecord = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cells[index] ?? "";
    });
    if (Object.values(record).some((value) => String(value).trim() !== "")) records.push(record);
  }
  return records;
}

/** Descarga el catálogo actual como .xlsx listo para reimportar. */
async function exportProductsToExcel(): Promise<void> {
  const [productsResult, specsResult, categoriesResult] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase.from("product_specs").select("product_id, label, value, position").order("position"),
    supabase.from("categories").select("id, name"),
  ]);
  if (productsResult.error) throw productsResult.error;
  const specsByProduct = new Map<string, string[]>();
  for (const spec of specsResult.data ?? []) {
    const list = specsByProduct.get(spec.product_id) ?? [];
    list.push(`${spec.label}:${spec.value}`);
    specsByProduct.set(spec.product_id, list);
  }
  const categoryNames = new Map((categoriesResult.data ?? []).map((c) => [c.id, c.name]));
  const headers = [
    "Nombre",
    "Slug",
    "Categoría",
    "Marca",
    "Valoración",
    "Precio (EUR)",
    "Moneda",
    "URL de imagen",
    "URL de producto en Amazon",
    "Descripción corta",
    "Análisis completo",
    "Pros",
    "Contras",
    "Ficha técnica",
    "Destacado",
  ];
  const rows = (productsResult.data ?? []).map((product: Record<string, unknown>) => [
    String(product.name ?? ""),
    String(product.slug ?? ""),
    categoryNames.get(String(product.category_id ?? "")) ?? "",
    String(product.brand ?? ""),
    (product.rating as number | null) ?? "",
    (product.price as number | null) ?? "",
    String(product.currency ?? "EUR"),
    String(product.image_url ?? ""),
    String(product.amazon_url ?? ""),
    String(product.short_description ?? ""),
    String(product.description ?? ""),
    (product.pros as string[] | null)?.join("|") ?? "",
    (product.cons as string[] | null)?.join("|") ?? "",
    (specsByProduct.get(String(product.id ?? "")) ?? []).join("|"),
    product.featured ? "si" : "no",
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((header, index) => ({
    wch: index === 10 ? 60 : Math.max(12, header.length + 2),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Productos");
  XLSX.writeFile(workbook, "catalogo-productos.xlsx");
}

/** Plantilla .xlsx generada desde el CSV de ejemplo de cada destino. */
function downloadTemplateExcel(target: TargetId) {
  const matrix = parseDelimited(TEMPLATES[target], ",");
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, target);
  XLSX.writeFile(workbook, `plantilla-${target}.xlsx`);
}

/* -------------------------------------------------------------------------- */
/*  Reglas de validación por destino                                           */
/* -------------------------------------------------------------------------- */

const slugRule = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/, { message: "solo minúsculas, números y guiones" });

const productSchema = z.object({
  slug: slugRule,
  name: z.string().trim().min(2).max(120),
  amazon_url: z.string().trim().url({ message: "URL de Amazon no válida" }).max(500),
  brand: z.string().trim().max(80),
  short_description: z.string().trim().max(200),
  description: z.string().trim().max(5000),
  price: z.number().nonnegative().max(1000000).nullable(),
  image_url: z.string().trim().url({ message: "URL de imagen no válida" }).max(500).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  featured: z.boolean(),
  category_id: z.string().uuid().nullable(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, { message: "código de moneda de 3 letras (ej. EUR)" }),
});

const postSchema = z.object({
  slug: slugRule,
  title: z.string().trim().min(2).max(160),
  excerpt: z.string().trim().max(400),
  content: z.string(),
  cover_image_url: z
    .string()
    .trim()
    .url({ message: "URL de portada no válida" })
    .max(500)
    .nullable(),
  tags: z.array(z.string()),
  published: z.boolean(),
});

const priceSchema = z.object({
  slug: slugRule,
  price: z.number().nonnegative().max(1000000),
  recorded_at: z.string().trim().min(1),
});

/* -------------------------------------------------------------------------- */
/*  Tipos de las filas preparadas                                              */
/* -------------------------------------------------------------------------- */

type PreparedProduct = {
  slug: string;
  payload: ProductInsert;
  specs: { label: string; value: string }[];
};

type PreparedPost = { slug: string; payload: PostInsert };
type PreparedPrice = { slug: string; payload: Omit<PriceInsert, "product_id"> };

type RowPreview = {
  /** Número de fila tal como aparece en el origen (1 = primera fila de datos). */
  row: number;
  label: string;
  errors: string[];
  warnings: string[];
};

type Prepared =
  | { target: "products"; rows: PreparedProduct[]; preview: RowPreview[]; warnings: string[] }
  | { target: "posts"; rows: PreparedPost[]; preview: RowPreview[]; warnings: string[] }
  | { target: "prices"; rows: PreparedPrice[]; preview: RowPreview[]; warnings: string[] };

/** Convierte los registros crudos en filas listas para insertar + informe de errores. */
function prepare(
  target: TargetId,
  records: RawRecord[],
  categoryMap: Map<string, string>,
): Prepared {
  const preview: RowPreview[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  if (target === "products") {
    const rows: PreparedProduct[] = [];
    records.forEach((record, index) => {
      const row = index + 1;
      const label = String(record.name ?? record.nombre ?? record.slug ?? `Fila ${row}`);
      const categoryKey = String(
        record.category ?? record.category_slug ?? record.categoria ?? record.categoria_slug ?? "",
      )
        .trim()
        .toLowerCase();
      const categoryId = categoryKey ? (categoryMap.get(categoryKey) ?? null) : null;
      const rowWarnings: string[] = [];
      if (categoryKey && !categoryId) {
        rowWarnings.push(`categoría "${categoryKey}" no encontrada, se guarda sin categoría`);
      }

      const parsed = productSchema.safeParse({
        slug: String(record.slug ?? record.url_amigable ?? "").toLowerCase(),
        name: String(record.name ?? record.nombre ?? ""),
        amazon_url: String(
          record.amazon_url ??
            record.url_amazon ??
            record.url_de_producto_en_amazon ??
            record.url_producto_en_amazon ??
            record.enlace ??
            record.enlace_amazon ??
            "",
        ),
        brand: String(record.brand ?? record.marca ?? ""),
        short_description: String(
          record.short_description ?? record.descripcion_corta ?? record.resumen ?? "",
        ),
        description: String(
          record.description ??
            record.descripcion ??
            record.analisis_completo ??
            record.analisis ??
            record.descripcion_completa ??
            "",
        ),
        price: parseNumber(record.price ?? record.precio ?? record.precio_eur),
        image_url:
          String(
            record.image_url ??
              record.url_de_imagen ??
              record.url_imagen ??
              record.imagen_url ??
              record.imagen ??
              "",
          ).trim() || null,
        rating: parseNumber(record.rating ?? record.valoracion),
        featured: parseBoolean(record.featured ?? record.destacado),
        category_id: categoryId,
        currency:
          String(record.currency ?? record.moneda ?? "EUR")
            .trim()
            .toUpperCase() || "EUR",
      });

      if (!parsed.success) {
        preview.push({
          row,
          label,
          errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
          warnings: rowWarnings,
        });
        return;
      }
      if (seen.has(parsed.data.slug)) {
        preview.push({
          row,
          label,
          errors: [`slug duplicado en el lote: ${parsed.data.slug}`],
          warnings: rowWarnings,
        });
        return;
      }
      seen.add(parsed.data.slug);

      rows.push({
        slug: parsed.data.slug,
        payload: {
          slug: parsed.data.slug,
          name: parsed.data.name,
          brand: parsed.data.brand || null,
          category_id: parsed.data.category_id,
          short_description: parsed.data.short_description,
          description: parsed.data.description,
          price: parsed.data.price,
          currency: parsed.data.currency,
          image_url: parsed.data.image_url,
          amazon_url: parsed.data.amazon_url,
          rating: parsed.data.rating,
          featured: parsed.data.featured,
          pros: parseList(record.pros ?? record.ventajas),
          cons: parseList(record.cons ?? record.contras ?? record.desventajas),
          updated_at: new Date().toISOString(),
        },
        specs: parseSpecs(
          record.specs ?? record.ficha_tecnica ?? record.especificaciones ?? record.caracteristicas,
        ),
      });
      preview.push({ row, label, errors: [], warnings: rowWarnings });
    });
    return { target: "products", rows, preview, warnings };
  }

  if (target === "posts") {
    const rows: PreparedPost[] = [];
    records.forEach((record, index) => {
      const row = index + 1;
      const label = String(record.title ?? record.slug ?? `Fila ${row}`);
      const parsed = postSchema.safeParse({
        slug: String(record.slug ?? "").toLowerCase(),
        title: String(record.title ?? record.titulo ?? ""),
        excerpt: String(record.excerpt ?? record.resumen ?? ""),
        content: String(record.content ?? record.contenido ?? ""),
        cover_image_url: String(record.cover_image_url ?? record.portada ?? "") || null,
        tags: parseList(record.tags ?? record.etiquetas),
        published: record.published === undefined ? true : parseBoolean(record.published),
      });
      if (!parsed.success) {
        preview.push({
          row,
          label,
          errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
          warnings: [],
        });
        return;
      }
      if (seen.has(parsed.data.slug)) {
        preview.push({
          row,
          label,
          errors: [`slug duplicado en el lote: ${parsed.data.slug}`],
          warnings: [],
        });
        return;
      }
      seen.add(parsed.data.slug);
      rows.push({
        slug: parsed.data.slug,
        payload: {
          slug: parsed.data.slug,
          title: parsed.data.title,
          excerpt: parsed.data.excerpt,
          content: parsed.data.content,
          cover_image_url: parsed.data.cover_image_url,
          tags: parsed.data.tags,
          published: parsed.data.published,
          updated_at: new Date().toISOString(),
        },
      });
      preview.push({ row, label, errors: [], warnings: [] });
    });
    return { target: "posts", rows, preview, warnings };
  }

  const rows: PreparedPrice[] = [];
  records.forEach((record, index) => {
    const row = index + 1;
    const label = String(record.slug ?? `Fila ${row}`);
    const rawDate = String(record.recorded_at ?? record.fecha ?? "").trim();
    const recordedAt = rawDate ? toIso(rawDate) : new Date().toISOString();
    if (!recordedAt) {
      preview.push({ row, label, errors: [`fecha no válida: "${rawDate}"`], warnings: [] });
      return;
    }
    const parsed = priceSchema.safeParse({
      slug: String(record.slug ?? "").toLowerCase(),
      price: parseNumber(record.price ?? record.precio),
      recorded_at: recordedAt,
    });
    if (!parsed.success) {
      preview.push({
        row,
        label,
        errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
        warnings: [],
      });
      return;
    }
    rows.push({
      slug: parsed.data.slug,
      payload: {
        price: parsed.data.price,
        recorded_at: parsed.data.recorded_at,
      },
    });
    preview.push({ row, label, errors: [], warnings: [] });
  });
  return { target: "prices", rows, preview, warnings };
}

/* -------------------------------------------------------------------------- */
/*  Componente                                                                 */
/* -------------------------------------------------------------------------- */

export function AdminImport() {
  const queryClient = useQueryClient();
  const { data: categories } = useQuery(categoriesQuery);
  const [target, setTarget] = useState<TargetId>("products");
  const [text, setText] = useState("");
  const [fileRecords, setFileRecords] = useState<RawRecord[] | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) {
      map.set(category.slug.toLowerCase(), category.id);
      map.set(category.name.toLowerCase(), category.id);
    }
    return map;
  }, [categories]);

  const parsed = useMemo(() => {
    if (fileRecords) {
      return {
        records: fileRecords.map((record) => normalizeRecord(record)),
        errors: [],
        format: "xlsx" as const,
      };
    }
    return parseInput(text);
  }, [fileRecords, text]);
  const prepared = useMemo(
    () => prepare(target, parsed.records, categoryMap),
    [target, parsed.records, categoryMap],
  );

  const validRows = prepared.rows.length;
  const invalidRows = prepared.preview.filter((item) => item.errors.length > 0).length;
  const warningRows = prepared.preview.filter(
    (item) => item.errors.length === 0 && item.warnings.length > 0,
  );

  const importRows = useMutation({
    mutationFn: async () => {
      if (prepared.target === "products") {
        const payloads = prepared.rows.map((row) => row.payload);
        const savedIds = new Map<string, string>();

        for (const group of chunk(payloads, 100)) {
          const { data, error } = await supabase
            .from("products")
            .upsert(group, { onConflict: "slug" })
            .select("id, slug");
          if (error) throw error;
          for (const row of data ?? []) savedIds.set(row.slug, row.id);
        }

        const ids = [...savedIds.values()];
        for (const group of chunk(ids, 100)) {
          const { error } = await supabase.from("product_specs").delete().in("product_id", group);
          if (error) throw error;
        }

        const specRows = prepared.rows.flatMap((row) => {
          const productId = savedIds.get(row.slug);
          if (!productId) return [];
          return row.specs.map((spec, index) => ({
            product_id: productId,
            label: spec.label,
            value: spec.value,
            position: index + 1,
          }));
        });
        for (const group of chunk(specRows, 200)) {
          const { error } = await supabase.from("product_specs").insert(group);
          if (error) throw error;
        }
        return prepared.rows.length;
      }

      if (prepared.target === "posts") {
        let total = 0;
        for (const group of chunk(
          prepared.rows.map((row) => row.payload),
          100,
        )) {
          const { error } = await supabase.from("blog_posts").upsert(group, { onConflict: "slug" });
          if (error) throw error;
          total += group.length;
        }
        return total;
      }

      const slugs = [...new Set(prepared.rows.map((row) => row.slug))];
      const { data: products, error: lookupError } = await supabase
        .from("products")
        .select("id, slug")
        .in("slug", slugs);
      if (lookupError) throw lookupError;

      const bySlug = new Map<string, string>();
      for (const product of products ?? []) bySlug.set(product.slug, product.id);

      const missing = slugs.filter((slug) => !bySlug.has(slug));
      const inserts = prepared.rows.flatMap<PriceInsert>((row) => {
        const productId = bySlug.get(row.slug);
        if (!productId) return [];
        return [{ ...row.payload, product_id: productId }];
      });
      for (const group of chunk(inserts, 200)) {
        const { error } = await supabase.from("price_history").insert(group);
        if (error) throw error;
      }
      if (missing.length > 0) {
        toast.warning(`${missing.length} producto(s) no existen y se han omitido`, {
          description: missing.slice(0, 5).join(", "),
        });
      }
      return inserts.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} fila(s) importadas correctamente`);
      setText("");
      setFileRecords(null);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
    },
    onError: (error: Error) => toast.error(`Error al importar: ${error.message}`),
  });

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo supera los 5 MB");
      return;
    }
    setFileName(file.name);
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      try {
        const records = parseWorkbookRecords(await file.arrayBuffer());
        if (records.length === 0) {
          toast.error("La hoja está vacía o no tiene filas de datos bajo la cabecera.");
          setFileRecords(null);
          return;
        }
        setFileRecords(records);
        setText("");
      } catch (error) {
        toast.error(`No se pudo leer el Excel: ${(error as Error).message}`);
        setFileRecords(null);
      }
      return;
    }
    setFileRecords(null);
    setText(await file.text());
  }

  function switchTarget(next: TargetId) {
    setTarget(next);
    setText("");
    setFileRecords(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const exportCatalog = useMutation({
    mutationFn: exportProductsToExcel,
    onSuccess: () => toast.success("Catálogo exportado como catalogo-productos.xlsx"),
    onError: (error: Error) => toast.error(`No se pudo exportar: ${error.message}`),
  });

  const activeTarget = TARGETS.find((item) => item.id === target) ?? TARGETS[0];

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Importación masiva</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pega un CSV, TSV o JSON, o sube un archivo .xlsx/.csv, para publicar muchos registros de
            golpe. Descarga el catálogo en Excel, edítalo o amplíalo y vuelve a importarlo: las filas
            con el mismo slug se actualizan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exportCatalog.isPending}
            onClick={() => exportCatalog.mutate()}
          >
            {exportCatalog.isPending ? "Exportando…" : "Exportar catálogo (Excel)"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadTemplateExcel(target)}>
            Plantilla Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadTemplate(target)}>
            Plantilla CSV
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[240px_1fr]">
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Qué vas a importar
          </Label>
          <Select value={target} onValueChange={(value) => switchTarget(value as TargetId)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGETS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">{activeTarget.hint}</p>
        </div>

        <div>
          <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Datos
          </Label>
          <Textarea
            rows={10}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFileRecords(null);
              setFileName("");
            }}
            placeholder={
              target === "products"
                ? "Nombre,Slug,Categoría,Marca,Valoración,Precio (EUR),Moneda,URL de imagen,URL de producto en Amazon,Descripción corta,Análisis completo,Pros,Contras,Ficha técnica,Destacado\nPortátil de Ejemplo,portatil-ejemplo,portatiles,MarcaX,4.5,899.99,EUR,,https://www.amazon.es/dp/B0EXAMPLE,Resumen corto,,Ligero|Buena autonomía,Se calienta,"
                : "Pega aquí el CSV o el JSON"
            }
            className="font-mono text-xs"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Subir archivo
            </Button>
            {fileName ? <span className="text-xs text-muted-foreground">{fileName}</span> : null}
            {text ? (
              <Button
                variant="ghost"
                size="sm"
              onClick={() => {
              setText("");
              setFileRecords(null);
              setFileName("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
              >
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <details className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Columnas que se reconocen para {activeTarget.label} ({COLUMN_DOCS[target].length})
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {COLUMN_DOCS[target].map((column) => (
            <div key={column.name} className="text-xs">
              <span className="font-mono font-medium">{column.name}</span>
              {column.required ? <span className="ml-1 text-destructive">*</span> : null}
              {column.note ? (
                <span className="ml-1 text-muted-foreground">— {column.note}</span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Las columnas con * son obligatorias. El orden no importa y los nombres se reconocen con o
          sin acentos, en español o en inglés. Descarga la plantilla CSV para ver un ejemplo ya
          relleno.
        </p>
      </details>

      {parsed.errors.length > 0 ? (
        <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-medium">No se pudo leer el contenido</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {parsed.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {prepared.preview.length > 0 ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-primary/15 px-3 py-1 font-medium text-primary">
              {validRows} listas
            </span>
            {invalidRows > 0 ? (
              <span className="rounded-full bg-destructive/15 px-3 py-1 font-medium text-destructive">
                {invalidRows} con errores
              </span>
            ) : null}
            {warningRows.length > 0 ? (
              <span className="rounded-full bg-amber-500/15 px-3 py-1 font-medium text-amber-600">
                {warningRows.length} con avisos
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">
              Formato detectado: {parsed.format.toUpperCase()}
            </span>
          </div>

          <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Registro</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {prepared.preview.map((item) => (
                  <tr key={`${item.row}-${item.label}`} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{item.row}</td>
                    <td className="px-3 py-2">{item.label}</td>
                    <td className="px-3 py-2">
                      {item.errors.length > 0 ? (
                        <span className="text-destructive">{item.errors.join("; ")}</span>
                      ) : item.warnings.length > 0 ? (
                        <span className="text-amber-600">{item.warnings.join("; ")}</span>
                      ) : (
                        <span className="text-emerald-600">Correcta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => importRows.mutate()}
          disabled={validRows === 0 || importRows.isPending}
        >
          {importRows.isPending ? "Importando…" : `Importar ${validRows} fila(s)`}
        </Button>
        {invalidRows > 0 ? (
          <span className="text-xs text-muted-foreground">
            Las filas con errores se omiten; el resto sí se importa.
          </span>
        ) : null}
      </div>
    </section>
  );
}
