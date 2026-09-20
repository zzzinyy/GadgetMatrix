import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function load(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
  };
}

const preferences = await load("../src/lib/preferences.ts");

test("favoritos alternan sin duplicados y toleran almacenamiento roto", () => {
  const storage = memoryStorage();
  assert.deepEqual(preferences.getFavorites(storage), []);
  assert.equal(preferences.toggleFavorite("sony-xm5", storage), true);
  assert.equal(preferences.toggleFavorite("sony-xm5", storage), false);
  assert.deepEqual(preferences.getFavorites(storage), []);
  preferences.toggleFavorite("a", storage);
  preferences.toggleFavorite("b", storage);
  assert.deepEqual(preferences.getFavorites(storage), ["a", "b"]);
  assert.equal(preferences.isFavorite("a", storage), true);
  // JSON corrupto o tipos raros no rompen: se empieza de cero.
  storage.setItem("gadgetmatrix:favorites", "no-json{{{");
  assert.deepEqual(preferences.getFavorites(storage), []);
  storage.setItem("gadgetmatrix:favorites", JSON.stringify([1, null, "ok"]));
  assert.deepEqual(preferences.getFavorites(storage), ["ok"]);
  assert.equal(preferences.toggleFavorite("  ", storage), false);
});

test("historial: reciente primero, sin duplicados y con límite de 20", () => {
  const storage = memoryStorage();
  assert.deepEqual(preferences.pushHistory("a", storage), ["a"]);
  assert.deepEqual(preferences.pushHistory("b", storage), ["b", "a"]);
  assert.deepEqual(preferences.pushHistory("a", storage), ["a", "b"]);
  for (let i = 0; i < 25; i++) preferences.pushHistory(`p${i}`, storage);
  const history = preferences.getHistory(storage);
  assert.equal(history.length, 20);
  assert.equal(history[0], "p24");
  preferences.clearHistory(storage);
  assert.deepEqual(preferences.getHistory(storage), []);
});

test("sin almacenamiento no se rompe nada", () => {
  assert.deepEqual(preferences.getFavorites(undefined), []);
  assert.deepEqual(preferences.getHistory(undefined), []);
  assert.equal(preferences.isFavorite("x", undefined), false);
});

const theme = await load("../src/lib/theme.ts");

test("tema: oscuro por defecto, claro opt-in, respeta el sistema", () => {
  assert.equal(theme.getTheme(undefined), "dark");
  assert.equal(theme.getTheme(memoryStorage()), "dark");
  assert.equal(theme.getTheme(memoryStorage({ "gadgetmatrix:theme": "light" })), "light");
  assert.equal(theme.getTheme(memoryStorage({ "gadgetmatrix:theme": "raro" })), "dark");
  assert.equal(theme.initialTheme(undefined, false), "dark");
  assert.equal(theme.initialTheme(undefined, true), "light");
  assert.equal(theme.initialTheme(memoryStorage({ "gadgetmatrix:theme": "dark" }), true), "dark");
});

const i18n = await load("../src/lib/i18n.ts");

test("idioma: español por defecto con textos en inglés disponibles", () => {
  assert.equal(i18n.getLocale(undefined), "es");
  assert.equal(i18n.getLocale(memoryStorage({ "gadgetmatrix:locale": "en" })), "en");
  assert.equal(i18n.getLocale(memoryStorage({ "gadgetmatrix:locale": "fr" })), "es");
  assert.equal(i18n.t("nav", "products", "es"), "Productos");
  assert.equal(i18n.t("nav", "products", "en"), "Products");
  assert.equal(i18n.t("search", "button", "en"), "Search…");
  assert.equal(i18n.t("favorites", "empty", "es").length > 0, true);
});
