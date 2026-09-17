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

export function validateProduct(value: unknown, publishing = false): ProductDraft {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Ficha no válida.");
  const data = value as Record<string, unknown>;
  function text(key: string, max: number) {
    const v = data[key] ?? "";
    if (typeof v !== "string" || v.trim().length > max)
      throw new Error(`${key}: texto no válido (máximo ${max}).`);
    return v.trim();
  }
  function number(key: string, max: number) {
    const v = data[key];
    if (v == null || v === "") return null;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max)
      throw new Error(`${key}: número fuera de rango.`);
    return v;
  }
  function list(key: string) {
    const v = data[key] ?? [];
    if (
      !Array.isArray(v) ||
      v.length > 30 ||
      v.some((x) => typeof x !== "string" || x.length > 500)
    )
      throw new Error(`${key}: lista no válida.`);
    return (v as string[]).map((x) => x.trim()).filter(Boolean);
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
