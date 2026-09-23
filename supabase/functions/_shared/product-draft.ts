// Shared by the browser and Edge Function. Never trust model output or client input.
export type ProductDraft = {
  name: string;
  slug: string;
  brand: string;
  category_id: string | null;
  short_description: string;
  description: string;
  price: number | null;
  currency: string;
  image_url: string;
  amazon_url: string;
  rating: number | null;
  featured: boolean;
  pros: string[];
  cons: string[];
  specs: { label: string; value: string }[];
};

const MAX_LIST_ITEMS = 30;
const MAX_LIST_ITEM_LENGTH = 500;

/** Interpreta un token numérico admitiendo separadores ES (1.234,56) y EN. */
function parseNumericToken(token: string): number | null {
  if (!token) return null;
  let normalized = token;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(token)) normalized = token.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(token)) normalized = token.replace(/,/g, "");
  else normalized = token.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Número a partir de lo que devuelva un modelo o una hoja de cálculo:
 * 899.99, "899,99", "899,99 EUR", "1.234,56", "4.5 de 5 estrellas".
 */
export function coerceNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\s\u00a0]/g, "")
    .replace(/[\u20ac$\u00a3]/g, "")
    .replace(/(?:eur|euros|usd|gbp)/gi, "");
  const direct = parseNumericToken(cleaned);
  if (direct != null) return direct;
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  return match ? parseNumericToken(match[0]) : null;
}

/** Booleanos tal como los devuelven modelos u hojas de cálculo. */
export function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string")
    return ["true", "si", "s\u00ed", "yes", "1", "destacado"].includes(value.trim().toLowerCase());
  return false;
}

/**
 * Pros/contras: acepta array de textos, texto suelto con saltos de linea o
 * guiones, y arrays de objetos {label,value} que algunos modelos devuelven.
 */
export function coerceList(value: unknown): string[] {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const item of items) {
    if (typeof item === "string" || typeof item === "number") {
      for (const part of String(item).split(/\r?\n|[\u2022\u00b7]/)) out.push(part);
    } else if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const pick = (keys: string[]) => {
        for (const key of keys) {
          const candidate = record[key];
          if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
          if (typeof candidate === "number") return String(candidate);
        }
        return "";
      };
      const label = pick(["label", "title", "name"]);
      const detail = pick(["value", "text", "description", "detail"]);
      if (label && detail) out.push(`${label}: ${detail}`);
      else if (label || detail) out.push(label || detail);
    }
  }
  return out
    .map((item) =>
      item
        .replace(/^[\s\-*\u2022\u00b7]+/, "")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((item) => item.length > 1)
    .map((item) => item.slice(0, MAX_LIST_ITEM_LENGTH))
    .slice(0, MAX_LIST_ITEMS);
}

export function validateProduct(value: unknown, publishing = false): ProductDraft {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Ficha no válida.");
  const data = value as Record<string, unknown>;
  // El modelo puede devolver escalares donde se espera texto: se convierten y
  // se recortan en lugar de descartar la ficha completa.
  function text(key: string, max: number) {
    const raw = data[key];
    const v =
      raw == null ? "" : typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";
    return v.trim().slice(0, max);
  }
  function number(key: string, max: number) {
    const parsed = coerceNumber(data[key]);
    if (parsed == null) return null;
    if (parsed < 0 || parsed > max) throw new Error(`${key}: número fuera de rango.`);
    return parsed;
  }
  function list(key: string) {
    return coerceList(data[key]);
  }
  const name = text("name", 120);
  const slug = text("slug", 80);
  if (
    (publishing && name.length < 2) ||
    (slug && !/^[a-z0-9-]{2,80}$/.test(slug)) ||
    (publishing && !slug)
  )
    throw new Error("Revisa el nombre y el slug (minúsculas, números y guiones).");
  const amazon_url = text("amazon_url", 500);
  const image_url = text("image_url", 500);
  for (const [key, url] of [
    ["amazon_url", amazon_url],
    ["image_url", image_url],
  ]) {
    if (!url) continue;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`${key}: URL no válida.`);
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      throw new Error(`${key}: usa una URL HTTPS sin credenciales.`);
    if (
      key === "amazon_url" &&
      !/^(www\.)?(amazon\.(es|com|de|fr|it|co\.uk)|amzn\.to)$/.test(parsed.hostname)
    )
      throw new Error("El enlace debe pertenecer a Amazon o amzn.to.");
  }
  if (publishing && !amazon_url) throw new Error("Falta el enlace de Amazon.");
  const currency = text("currency", 3) || "EUR";
  if (currency !== "EUR") throw new Error("Esta ficha utiliza precios en EUR.");
  const category_id = data.category_id || null;
  if (
    category_id !== null &&
    (typeof category_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category_id))
  )
    throw new Error("Categoría no válida.");
  const rawSpecs = data.specs ?? [];
  if (!Array.isArray(rawSpecs) || rawSpecs.length > 50)
    throw new Error("Máximo 50 especificaciones.");
  const specs = rawSpecs.map((s: unknown) => {
    if (!s || typeof s !== "object") throw new Error("Especificación no válida.");
    const { label, value } = s as Record<string, unknown>;
    if (
      typeof label !== "string" ||
      typeof value !== "string" ||
      !label.trim() ||
      !value.trim() ||
      label.length > 100 ||
      value.length > 500
    )
      throw new Error("Cada especificación necesita etiqueta y valor.");
    return { label: label.trim(), value: value.trim() };
  });
  if (data.featured !== undefined && typeof data.featured !== "boolean")
    throw new Error("Destacado no válido.");
  return {
    name,
    slug,
    amazon_url,
    image_url,
    currency,
    category_id,
    specs,
    brand: text("brand", 80),
    short_description: text("short_description", 200),
    description: text("description", 5000),
    price: number("price", 1000000),
    rating: number("rating", 5),
    featured: data.featured === true,
    pros: list("pros"),
    cons: list("cons"),
  };
}

export function validatePublishRequest(body: Record<string, unknown>) {
  if (body.confirmed !== true) throw new Error("Se requiere confirmación explícita para publicar.");
  if (
    typeof body.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)
  )
    throw new Error("Identificador de publicación no válido.");
  return { requestId: body.requestId, draft: validateProduct(body.draft, true) };
}
