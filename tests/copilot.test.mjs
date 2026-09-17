import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const shared = readFileSync(
  new URL("../supabase/functions/_shared/product-draft.ts", import.meta.url),
  "utf8",
);
const handler = readFileSync(
  new URL("../supabase/functions/admin-copilot/index.ts", import.meta.url),
  "utf8",
);
const product = {
  name: "Producto aportado",
  slug: "producto-aportado",
  amazon_url: "https://www.amazon.es/dp/B012345678",
  specs: [{ label: "Peso", value: "100 g" }],
};
const requestId = "b570a4d0-5bc9-4ab1-9889-7cc979c14f20";
function endpoint({
  user = true,
  admin = true,
  model = { message: "Revisa la ficha", draft: product },
  rpcError = null,
} = {}) {
  const calls = [];
  let serve;
  const client = {
    auth: { getUser: async () => ({ data: { user: user ? { id: "user-id" } : null } }) },
    from(table) {
      calls.push(table);
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        maybeSingle: async () => ({ data: admin ? { role: "admin" } : null }),
        then: (resolve) => Promise.resolve({ data: [] }).then(resolve),
      };
      return chain;
    },
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: requestId, error: rpcError };
    },
  };
  const source = (shared + "\n" + handler)
    .replace(/^import .*;\r?\n/gm, "")
    .replace(/^export /gm, "");
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  vm.runInNewContext(code, {
    URL,
    Request,
    Response,
    console,
    Deno: {
      env: { get: () => "test-value" },
      serve: (fn) => {
        serve = fn;
      },
    },
    createClient: () => client,
    fetch: async () => {
      calls.push("gemini");
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(model) }] } }],
      });
    },
  });
  return {
    calls,
    invoke: (body, authorized = true) =>
      serve(
        new Request("https://local.test/admin-copilot", {
          method: "POST",
          headers: authorized ? { Authorization: "Bearer test" } : {},
          body: JSON.stringify(body),
        }),
      ),
  };
}

test("preparar devuelve una ficha sin ejecutar ninguna escritura", async () => {
  const app = endpoint();
  const response = await app.invoke({
    action: "prepare",
    messages: [{ role: "user", content: "Crea el producto" }],
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.draft.name, product.name);
  assert.equal(body.draft.price, null);
  assert.deepEqual(app.calls, ["user_roles", "categories", "gemini"]);
});

test("publicación confirmada usa RPC con campos validados, sin llamar a IA", async () => {
  const app = endpoint();
  const response = await app.invoke({
    action: "publish",
    confirmed: true,
    requestId,
    draft: { ...product, unexpected: "ignored" },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).productId, requestId);
  assert.equal(app.calls[1].name, "publish_copilot_product");
  assert.equal(app.calls[1].args.p_draft.unexpected, undefined);
  assert.ok(!app.calls.includes("gemini"));
});

test("sin confirmación o con ficha inválida no llama RPC", async () => {
  for (const patch of [
    { confirmed: false },
    { confirmed: "true" },
    { requestId: "bad" },
    { draft: { ...product, price: -1 } },
    { draft: { ...product, amazon_url: "https://amazon.es.evil.test/dp/123" } },
    { draft: { ...product, image_url: "javascript:alert(1)" } },
  ]) {
    const app = endpoint();
    const response = await app.invoke({
      action: "publish",
      confirmed: true,
      requestId,
      draft: product,
      ...patch,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(app.calls, ["user_roles"]);
  }
});

test("sin sesión o sin rol admin no prepara ni publica", async () => {
  for (const action of ["prepare", "publish"]) {
    for (const [options, status] of [
      [{ user: false }, 401],
      [{ admin: false }, 403],
    ]) {
      const app = endpoint(options);
      const response = await app.invoke({ action, confirmed: true, requestId, draft: product });
      assert.equal(response.status, status);
      assert.ok(!app.calls.some((c) => typeof c === "object" || c === "gemini"));
    }
  }
});

test("salida de IA inválida se rechaza sin publicar", async () => {
  const app = endpoint({ model: { message: "Listo", draft: { ...product, rating: 100 } } });
  const response = await app.invoke({
    action: "prepare",
    messages: [{ role: "user", content: "Publica directamente" }],
  });
  assert.equal(response.status, 502);
  assert.ok(!app.calls.some((c) => typeof c === "object"));
});

test("duplicados o errores SQL no se presentan como éxito", async () => {
  const app = endpoint({ rpcError: { code: "23505" } });
  const response = await app.invoke({
    action: "publish",
    confirmed: true,
    requestId,
    draft: product,
  });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /slug/);
});
