import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BASE_PATH,
  SITE_ORIGIN,
  buildSitemap,
  collectRoutes,
  escapeXml,
  generateSitemap,
  isIndexable,
  normalizeBase,
  priorityFor,
  routeFromFile,
} from "../scripts/generate-sitemap.mjs";

const OUTPUT = "/tmp/site/public";

test("normalizeBase always yields a single leading and trailing slash", () => {
  assert.equal(normalizeBase("GadgetMatrix"), "/GadgetMatrix/");
  assert.equal(normalizeBase("/GadgetMatrix"), "/GadgetMatrix/");
  assert.equal(normalizeBase("/GadgetMatrix/"), "/GadgetMatrix/");
  assert.equal(normalizeBase("/"), "/");
  assert.equal(normalizeBase(""), "/");
  assert.equal(normalizeBase(undefined), "/");
});

test("routeFromFile maps prerendered index files to public routes", () => {
  assert.equal(routeFromFile(`${OUTPUT}/index.html`, OUTPUT), "/");
  assert.equal(routeFromFile(`${OUTPUT}/productos/index.html`, OUTPUT), "/productos/");
  assert.equal(routeFromFile(`${OUTPUT}/producto/auriculares/index.html`, OUTPUT), "/producto/auriculares/");
  assert.equal(routeFromFile(path.join(OUTPUT, "blog", "index.html"), OUTPUT), "/blog/");
});

test("private and service routes are never indexable", () => {
  for (const route of ["/admin/", "/auth/", "/perfil/", "/404/", "/admin/"]) {
    assert.equal(isIndexable(route), false, route);
  }
  for (const route of ["/", "/productos/", "/blog/", "/comparador/"]) {
    assert.equal(isIndexable(route), true, route);
  }
});

test("collectRoutes dedupes, drops private pages and puts the homepage first", () => {
  const files = [
    `${OUTPUT}/index.html`,
    `${OUTPUT}/productos/index.html`,
    `${OUTPUT}/productos/index.html`,
    `${OUTPUT}/blog/index.html`,
    `${OUTPUT}/admin/index.html`,
    `${OUTPUT}/auth/index.html`,
    `${OUTPUT}/perfil/index.html`,
    `${OUTPUT}/404.html`,
    `${OUTPUT}/robots.txt`,
    `${OUTPUT}/blog/articulo/index.html`,
  ];
  assert.deepEqual(collectRoutes(files, OUTPUT), [
    "/",
    "/blog/",
    "/blog/articulo/",
    "/productos/",
  ]);
});

test("priority drops with page depth", () => {
  assert.equal(priorityFor("/"), "1.0");
  assert.equal(priorityFor("/productos/"), "0.8");
  assert.equal(priorityFor("/producto/auriculares/"), "0.6");
});

test("escapeXml neutralises XML metacharacters", () => {
  assert.equal(escapeXml("a&b<c>d\"e'f"), "a&amp;b&lt;c&gt;d&quot;e&apos;f");
});

test("buildSitemap emits a valid urlset with absolute URLs", () => {
  const xml = buildSitemap(["/", "/productos/", "/producto/uno/"], { lastmod: "2026-09-19" });
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset '));
  assert.ok(xml.endsWith("</urlset>\n"));
  assert.equal((xml.match(/<url>/g) ?? []).length, 3);
  assert.ok(xml.includes(`<loc>${SITE_ORIGIN}${BASE_PATH}</loc>`));
  assert.ok(xml.includes(`<loc>${SITE_ORIGIN}${BASE_PATH}productos/</loc>`));
  assert.ok(xml.includes(`<loc>${SITE_ORIGIN}${BASE_PATH}producto/uno/</loc>`));
  assert.ok(xml.includes("<lastmod>2026-09-19</lastmod>"));
  assert.ok(!xml.includes("<loc>undefined"));
});

test("buildSitemap honours a custom origin and base path", () => {
  const xml = buildSitemap(["/"], { origin: "https://example.com/", base: "app", lastmod: "2026-01-02" });
  assert.ok(xml.includes("<loc>https://example.com/app/</loc>"));
  assert.ok(!xml.includes("//app//"));
});

test("generateSitemap writes a sitemap.xml that matches the published artifact", async () => {
  const root = path.join(tmpdir(), `gadgetmatrix-sitemap-${process.pid}`);
  await rm(root, { recursive: true, force: true });
  for (const dir of ["", "productos", "producto/uno", "admin", "auth", "perfil", "blog"]) {
    const target = path.join(root, dir);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "index.html"), "<html></html>");
  }
  await writeFile(path.join(root, "404.html"), "<html></html>");
  await mkdir(path.join(root, ".well-known"), { recursive: true });
  await writeFile(path.join(root, ".well-known", "security.txt"), "Contact: mailto:x@y.z");

  try {
    const { file, routes } = await generateSitemap({ outputDir: root, lastmod: "2026-09-19" });
    assert.equal(file, path.join(root, "sitemap.xml"));
    assert.deepEqual(routes, ["/", "/blog/", "/productos/", "/producto/uno/"]);
    const written = await readFile(file, "utf8");
    assert.equal(written, buildSitemap(routes, { outputDir: root, lastmod: "2026-09-19" }));
    assert.ok(!written.includes("/admin"));
    assert.ok(!written.includes("/auth"));
    assert.ok(!written.includes("/perfil"));
    assert.ok(!written.includes("404"));
    assert.ok(!written.includes("security.txt"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
