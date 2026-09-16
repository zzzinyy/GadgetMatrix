import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Ejecuta la lógica real con una API simulada: nunca escribe eventos en Supabase.
async function loadAnalytics(responses = []) {
  const calls = [];
  const source = readFileSync(new URL("../src/lib/analytics.ts", import.meta.url), "utf8").replace(
    /^import .* from .*;\r?\n/gm,
    "",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(
      `let supabase; const queryOptions = x => x; export const setup = x => { supabase = x };\n${code}`,
    ).toString("base64")}`
  );
  module.setup({
    from(table) {
      const call = { table };
      calls.push(call);
      const chain = {};
      for (const key of ["select", "gte", "lte", "order", "range", "insert"]) {
        chain[key] = (...args) => {
          call[key] = args;
          return chain;
        };
      }
      chain.abortSignal = async () => responses.shift() ?? { data: [], error: null };
      chain.then = (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject);
      return chain;
    },
  });
  return { module, calls };
}

test("lee todas las páginas incluso cuando el servidor devuelve menos de 1000 filas", async () => {
  const event = { product_id: "one", event_type: "view", created_at: new Date().toISOString() };
  const { module, calls } = await loadAnalytics([
    { data: [event, event] },
    { data: [event] },
    { data: [] },
  ]);
  const options = module.eventsQuery(7);
  const result = await options.queryFn({ signal: new AbortController().signal });
  assert.equal(result.length, 3);
  assert.deepEqual(
    calls.map((c) => c.range),
    [
      [0, 999],
      [2, 1001],
      [3, 1002],
    ],
  );
  assert.equal(options.refetchInterval, 30000);
  assert.equal(calls[0].gte[1].slice(11), "00:00:00.000Z");
  const daily = module.buildDailySeries(result, 7);
  assert.equal(daily[0].day, calls[0].gte[1].slice(0, 10));
  assert.equal(daily.length, 7);
  assert.equal(
    daily.reduce((sum, day) => sum + day.view, 0),
    3,
  );
  assert.equal(module.buildProductTotals(result, new Map([["one", "Producto"]]))[0].total, 3);
});

test("propaga errores de lectura, no los convierte en una lista vacía", async () => {
  const { module } = await loadAnalytics([{ error: new Error("Sin permisos") }]);
  await assert.rejects(
    module.eventsQuery(30).queryFn({ signal: new AbortController().signal }),
    /Sin permisos/,
  );
});

test("periodo vacío y tipos desconocidos no generan actividad ficticia", async () => {
  const { module } = await loadAnalytics();
  assert.deepEqual(
    await module.eventsQuery(90).queryFn({ signal: new AbortController().signal }),
    [],
  );
  assert.equal(module.buildDailySeries([], 90).length, 90);
  assert.deepEqual(
    module.buildProductTotals([{ product_id: "one", event_type: "unknown" }], new Map()),
    [],
  );
});

test("un fallo al registrar una interacción se informa sin bloquear la navegación", async () => {
  const { module } = await loadAnalytics([{ error: new Error("Inserción denegada") }]);
  const messages = [];
  const original = console.error;
  console.error = (...args) => messages.push(args);
  try {
    await module.trackEvent("one", "card_click");
    assert.equal(messages.length, 1);
    assert.match(messages[0][1].message, /Inserción denegada/);
  } finally {
    console.error = original;
  }
});
