import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/search.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const search = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

function product(slug, name, extra = {}) {
  return {
    slug,
    name,
    brand: null,
    categories: null,
    short_description: "",
    ...extra,
  };
}

function fixture() {
  const products = [
    product("sony-wh1000xm5", "Sony WH-1000XM5", {
      brand: "Sony",
      short_description: "Auriculares con cancelación de ruido",
      categories: { name: "Audio" },
    }),
    product("bose-qc45", "Bose QuietComfort 45", {
      brand: "Bose",
      short_description: "Auriculares cómodos para viajar",
      categories: { name: "Audio" },
    }),
  ];
  const posts = [
    {
      slug: "guia-auriculares",
      title: "Guía de auriculares 2026",
      excerpt: "Cómo elegir tus auriculares",
      tags: ["audio"],
      published: true,
    },
    {
      slug: "borrador",
      title: "Borrador invisible",
      excerpt: "No debería salir",
      tags: [],
      published: false,
    },
  ];
  const lists = [
    {
      slug: "mejores-moviles",
      title: "Mejores móviles",
      subtitle: "Ranking de móviles",
      description: "",
      published: true,
    },
  ];
  return {
    index: search.buildSearchIndex({ products, posts, lists }),
    lookup: search.buildLookup({ products, posts, lists }),
  };
}

test("normalizeQuery quita tildes, signos y espacios sobrantes", () => {
  assert.equal(search.normalizeQuery("  Móvil-Gaming!! "), "movil gaming");
  assert.deepEqual(search.queryTokens("el mejor móvil de 2026"), ["mejor", "movil", "2026"]);
  assert.deepEqual(search.queryTokens("a de y"), []);
});

test("encuentra por nombre, marca, descripción o categoría sin tildes", () => {
  const { index: idx, lookup } = fixture();
  assert.equal(search.searchIndex(idx, lookup, "sony")[0].slug, "sony-wh1000xm5");
  assert.equal(search.searchIndex(idx, lookup, "movil")[0].slug, "mejores-moviles");
  const audio = search.searchIndex(idx, lookup, "auriculares").map((r) => r.slug);
  assert.ok(audio.includes("sony-wh1000xm5"));
  assert.ok(audio.includes("bose-qc45"));
  assert.ok(audio.includes("guia-auriculares"));
});

test("todos los tokens deben coincidir y los borradores no salen", () => {
  const { index: idx, lookup } = fixture();
  assert.equal(search.searchIndex(idx, lookup, "sony bose").length, 0);
  assert.equal(search.searchIndex(idx, lookup, "sony ruido")[0].slug, "sony-wh1000xm5");
  assert.ok(!search.searchIndex(idx, lookup, "borrador").some((r) => r.slug === "borrador"));
  assert.deepEqual(search.searchIndex(idx, lookup, ""), []);
  assert.deepEqual(search.searchIndex(idx, lookup, "de"), []);
});

test("los productos pesan más que las páginas y el límite se respeta", () => {
  const { index: idx, lookup } = fixture();
  const results = search.searchIndex(idx, lookup, "guia auriculares");
  assert.equal(results[0].kind, "post");
  assert.equal(search.searchIndex(idx, lookup, "auriculares", 1).length, 1);
  const pages = search.searchIndex(idx, lookup, "comparador");
  assert.equal(pages[0].kind, "page");
  assert.equal(search.resultHref(pages[0]), "/comparador");
  assert.equal(search.resultHref({ kind: "product", slug: "x" }), "/producto/x");
});

test("GlobalSearch usa navegación del router y respeta el límite", () => {
  const component = readFileSync(
    new URL("../src/components/GlobalSearch.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /useNavigate/);
  assert.match(component, /shouldFilter=\{false\}/);
  assert.match(component, /searchIndex\(index, lookup, term, 8\)/);
});

test("la cabecera monta el buscador junto a la cuenta", () => {
  const header = readFileSync(new URL("../src/components/SiteHeader.tsx", import.meta.url), "utf8");
  assert.match(header, /import \{ GlobalSearch \} from "@\/components\/GlobalSearch"/);
  assert.match(header, /<GlobalSearch \/>/);
});
