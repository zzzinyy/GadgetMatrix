/**
 * Genera `sitemap.xml` a partir de las páginas ya prerenderizadas en `.output/public`.
 * Se ejecuta después del build (ver .github/workflows/deploy.yml) para que el sitemap
 * nunca anuncie rutas que no existan en el artefacto publicado.
 */
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Origen canónico del sitio, sin barra final. */
export const SITE_ORIGIN = "https://zzzinyy.github.io";
/** Prefijo de GitHub Pages donde vive la app. */
export const BASE_PATH = "/GadgetMatrix/";
/** Rutas privadas o de servicio que nunca deben aparecer en el sitemap. */
export const EXCLUDED_ROUTES = ["/panel-gm7k3", "/auth", "/perfil", "/404", "/admin"];

/** Convierte `GadgetMatrix`, `/GadgetMatrix` o `GadgetMatrix/` en `/GadgetMatrix/`. */
export function normalizeBase(base) {
  if (!base) return "/";
  const withLeading = base.startsWith("/") ? base : `/${base}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

/** Traduce la ruta de un fichero `index.html` a la ruta pública de su página. */
export function routeFromFile(file, outputDir) {
  const relative = path.relative(outputDir, file).split(path.sep).join("/");
  const trimmed = relative.replace(/(^|\/)index\.html$/, "").replace(/\/+$/, "");
  return trimmed ? `/${trimmed}/` : "/";
}

/** Descarta las rutas privadas (y sus hijas) para no filtrarlas en buscadores. */
export function isIndexable(route) {
  const normalized = route !== "/" ? route.replace(/\/+$/, "") : route;
  return !EXCLUDED_ROUTES.some(
    (excluded) => normalized === excluded || normalized.startsWith(`${excluded}/`),
  );
}

/**
 * Clave de orden: la barra se compara después de las letras, de modo que una
 * página de listado (`/productos/`) queda justo antes que sus fichas
 * (`/producto/uno/`) y un padre antes que sus hijas (`/blog/` → `/blog/x/`).
 */
function routeSortKey(route) {
  return route.split("/").join("\uFFFF");
}

/**
 * Compara dos rutas de forma determinista (sin depender del idioma del sistema):
 * la portada primero y, después, la clave de orden por código de carácter.
 */
export function compareRoutes(a, b) {
  if (a === b) return 0;
  if (a === "/") return -1;
  if (b === "/") return 1;
  const left = routeSortKey(a);
  const right = routeSortKey(b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Deduplica y ordena las rutas, dejando la portada siempre primero. */
export function collectRoutes(files, outputDir) {
  const routes = new Set();
  for (const file of files) {
    if (!file.endsWith("index.html")) continue;
    const route = routeFromFile(file, outputDir);
    if (isIndexable(route)) routes.add(route);
  }
  return [...routes].sort(compareRoutes);
}

/** Prioridad relativa según la profundidad de la ruta. */
export function priorityFor(route) {
  if (route === "/") return "1.0";
  const segments = route.split("/").filter(Boolean);
  return segments.length === 1 ? "0.8" : "0.6";
}

/** Escapa los caracteres reservados de XML. */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Construye el XML del sitemap. `lastmod` se inyecta para poder testearlo. */
export function buildSitemap(routes, options = {}) {
  const origin = (options.origin ?? SITE_ORIGIN).replace(/\/+$/, "");
  const base = normalizeBase(options.base ?? BASE_PATH);
  const lastmod = options.lastmod ?? new Date().toISOString().slice(0, 10);
  const urls = routes.map((route) => {
    const loc = `${origin}${base}${route === "/" ? "" : route.slice(1)}`;
    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
      `    <priority>${priorityFor(route)}</priority>`,
      "  </url>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

async function findIndexFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await findIndexFiles(full)));
    else if (entry.name === "index.html") found.push(full);
  }
  return found;
}

/** Lee el artefacto, escribe el sitemap y devuelve las rutas incluidas. */
export async function generateSitemap(options = {}) {
  const outputDir = path.resolve(options.outputDir ?? path.join(".output", "public"));
  const routes = collectRoutes(await findIndexFiles(outputDir), outputDir);
  const xml = buildSitemap(routes, options);
  const file = path.join(outputDir, options.fileName ?? "sitemap.xml");
  await writeFile(file, xml, "utf8");
  return { file, routes, xml };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const { file, routes } = await generateSitemap();
  console.log(`sitemap.xml escrito en ${file} con ${routes.length} URLs`);
  for (const route of routes) console.log(`  - ${route}`);
}
