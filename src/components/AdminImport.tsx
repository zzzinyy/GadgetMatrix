import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
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
    hint: "Crea o actualiza productos por slug. Al reimportar el mismo slug se actualiza, no se duplica.",
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

/* -------------------------------------------------------------------------- */
/*  Plantillas descargables                                                    */
/* -------------------------------------------------------------------------- */

const TEMPLATES: Record<TargetId, string> = {
  products: [
    "slug,name,brand,category,short_description,description,price,image_url,amazon_url,rating,featured,pros,cons,specs",
    'portatil-ejemplo,Portátil de Ejemplo,MarcaX,portatiles,Resumen corto para la tarjeta,Descripción larga del producto,899.99,https://images.example.com/foto.jpg,https://www.amazon.es/dp/B0EXAMPLE,4.5,si,Ligero|Buena autonomía,Se calienta mucho,Pantalla:14" OLED|Batería:40 h',
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

/** Quita acentos, pasa a minúsculas y convierte espacios/guiones en guion bajo. */
function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
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

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
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
      const label = String(record.name ?? record.slug ?? `Fila ${row}`);
      const categoryKey = String(record.category ?? record.category_slug ?? record.categoria ?? "")
        .trim()
        .toLowerCase();
      const categoryId = categoryKey ? (categoryMap.get(categoryKey) ?? null) : null;
      const rowWarnings: string[] = [];
      if (categoryKey && !categoryId) {
        rowWarnings.push(`categoría "${categoryKey}" no encontrada, se guarda sin categoría`);
      }

      const parsed = productSchema.safeParse({
        slug: String(record.slug ?? "").toLowerCase(),
        name: String(record.name ?? ""),
        amazon_url: String(record.amazon_url ?? record.url_amazon ?? record.enlace ?? ""),
        brand: String(record.brand ?? record.marca ?? ""),
        short_description: String(record.short_description ?? record.descripcion_corta ?? ""),
        description: String(record.description ?? record.descripcion ?? ""),
        price: parseNumber(record.price ?? record.precio),
        image_url: String(record.image_url ?? record.imagen ?? "").trim() || null,
        rating: parseNumber(record.rating ?? record.valoracion),
        featured: parseBoolean(record.featured ?? record.destacado),
        category_id: categoryId,
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
          currency: "EUR",
          image_url: parsed.data.image_url,
          amazon_url: parsed.data.amazon_url,
          rating: parsed.data.rating,
          featured: parsed.data.featured,
          pros: parseList(record.pros),
          cons: parseList(record.cons ?? record.contras),
          updated_at: new Date().toISOString(),
        },
        specs: parseSpecs(record.specs ?? record.ficha_tecnica ?? record.especificaciones),
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

  const parsed = useMemo(() => parseInput(text), [text]);
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
    setText(await file.text());
  }

  function switchTarget(next: TargetId) {
    setTarget(next);
    setText("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const activeTarget = TARGETS.find((item) => item.id === target) ?? TARGETS[0];

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Importación masiva</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pega un CSV, TSV o JSON (o sube un archivo) para publicar muchos registros de golpe.
            Funciona directamente contra la base de datos, así que también funciona en la web
            publicada.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadTemplate(target)}>
          Descargar plantilla CSV
        </Button>
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
              setFileName("");
            }}
            placeholder={
              target === "products"
                ? "slug,name,amazon_url,price,...\nportatil-ejemplo,Portátil de Ejemplo,https://www.amazon.es/dp/B0EXAMPLE,899.99"
                : "Pega aquí el CSV o el JSON"
            }
            className="font-mono text-xs"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json"
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
