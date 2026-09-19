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
  modelReply = null,
  rpcError = null,
  // Sustituto de las descargas externas (Amazon, imágenes). Null = simuladas.
  external = null,
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
    // Globals de Deno que el scraper usa y el sandbox no hereda.
    AbortController,
    TextDecoder,
    setTimeout,
    clearTimeout,
    // El scraper codifica la imagen con btoa (global de Deno).
    btoa: (data) => Buffer.from(data, "binary").toString("base64"),
    Deno: {
      env: { get: () => "test-value" },
      serve: (fn) => {
        serve = fn;
      },
    },
    createClient: () => client,
    fetch: async (url, init) => {
      const target = String(url);
      if (!target.includes("generativelanguage.googleapis.com")) {
        if (external) return external(target, init);
        // CDN de imágenes de Amazon: sirve bytes de imagen, no HTML. Va antes
        // que la comprobación de tienda porque su host contiene "amazon.com".
        if (/media-amazon\.com|\/images\/I\//.test(target)) {
          // Bytes reales de imagen: el scraper los guarda y los envía a Gemini
          // inline para que el modelo vea el producto aunque la página esté
          // bloqueada por el muro antibot.
          return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]), {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          });
        }
        if (/amazon\.(es|com|de|fr|it|co\.uk)/.test(target)) {
          return new Response(amazonHtml, { headers: { "content-type": "text/html" } });
        }
        return new Response(null, { status: 404 });
      }
      calls.push("gemini");
      calls.push({ url: target, headers: init?.headers });
      calls.push(JSON.parse(init?.body ?? "{}"));
      if (modelReply) return modelReply();
      return Response.json({ output_text: JSON.stringify(model) });
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

// Página de Amazon mínima pero real: título, marca, precio EUR, valoración,
// bullets y tabla de especificaciones, como la del caso del usuario.
const amazonHtml = `<!doctype html><html><body>
<span id="productTitle">Samsung Galaxy Tab A11 11" 64 GB WiFi Gris</span>
<div id="bylineInfo">Marca: Samsung</div>
<span class="a-offscreen">249,00&nbsp;&euro;</span>
<span class="a-icon-alt">4,5 de 5 estrellas</span>
<span id="acrCustomerReviewText">1.234 valoraciones</span>
<div id="feature-bullets"><ul>
<li><span class="a-list-item">Pantalla de 11 pulgadas</span></li>
<li><span class="a-list-item">Procesador octa-core</span></li>
<li><span class="a-list-item">Batería de larga duración</span></li>
</ul></div>
<table class="a-keyvalue">
<tr><td class="a-span3">Memoria RAM</td><td class="a-span9">8 GB</td></tr>
<tr><td class="a-span3">Almacenamiento</td><td class="a-span9">64 GB</td></tr>
</table>
<div id="productDescription"><p>Tableta Android de Samsung.</p></div>
<img src="https://m.media-amazon.com/images/I/51oHT85gdeL._AC_SL1080_.jpg">
</body></html>`;

test("URL de Amazon + imagen: la ficha se rellena con lo leído", async () => {
  const app = endpoint({
    model: {
      message: "Ficha preparada",
      draft: {
        ...product,
        name: "",
        slug: "",
        brand: "",
        short_description: "",
        description: "",
        price: null,
        rating: null,
        image_url: "",
        amazon_url: "",
        pros: [],
        cons: [],
        specs: [],
      },
    },
  });
  const response = await app.invoke({
    action: "prepare",
    messages: [
      {
        role: "user",
        content:
          "https://www.amazon.es/Samsung-Pulgadas-Tableta-Android-Internacional/dp/B0FMFRFNWG/ref=pd_ci_mcx_mh_mcx_views_0_image?pd_rd_w=2CPGP https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T2/images/I/51oHT85gdeL._AC_SL1080_.jpg",
      },
    ],
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  // El prompt debe llevar los datos verificados: el modelo redacta a partir
  // de ellos y el servidor los impone en la ficha final.
  const geminiBody = app.calls[app.calls.indexOf("gemini") + 2];
  const sys = String(geminiBody?.system_instruction ?? "");
  assert.ok(sys.includes("DATOS VERIFICADOS LEÍDOS DE LA PÁGINA DE AMAZON"));
  assert.ok(sys.includes("Pantalla de 11 pulgadas"));
  assert.equal(body.draft.name, 'Samsung Galaxy Tab A11 11" 64 GB WiFi Gris');
  assert.equal(body.draft.slug, "samsung-galaxy-tab-a11-11-64-gb-wifi-gris");
  assert.equal(body.draft.brand, "Samsung");
  assert.equal(body.draft.price, 249);
  assert.equal(body.draft.rating, 4.5);
  assert.ok(body.draft.amazon_url.includes("amazon.es"), body.draft.amazon_url);
  assert.equal(
    body.draft.image_url,
    "https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T2/images/I/51oHT85gdeL._AC_SL1080_.jpg",
  );
  assert.ok(body.draft.short_description.length > 0);
  assert.deepEqual(body.draft.pros, [
    "Pantalla de 11 pulgadas",
    "Procesador octa-core",
    "Batería de larga duración",
  ]);
  assert.equal(body.draft.specs.length, 2);
  assert.equal(body.draft.specs[0].label, "Memoria RAM");
  // El prompt llevaba los datos leídos para que redacte descripción/pros/cons.
  assert.ok(geminiBody.system_instruction.includes("DATOS VERIFICADOS"));
  // La imagen viaja inline: el modelo la ve aunque el scrape falle.
  const userInput = geminiBody.input[0].content;
  assert.equal(userInput[0].type, "text");
  const imagePart = userInput.find((part) => part.type === "image");
  assert.equal(imagePart?.mime_type, "image/jpeg");
  assert.ok(imagePart?.data.length > 0);
  assert.ok(
    userInput.some((part) => part.type === "text" && /Imagen del producto/.test(part.text)),
  );
  // Herramientas activas: url_context (lee la página si el scrape falla) y
  // google_search (contrasta specs y precios).
  assert.deepEqual(geminiBody.tools, [{ type: "url_context" }, { type: "google_search" }]);
});

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
  assert.equal(app.calls[0], "user_roles");
  assert.equal(app.calls[1], "categories");
  assert.equal(app.calls[2], "gemini");
  // La Interactions API con gemini-3.6-flash: endpoint, cabecera, modelo e input.
  const geminiCall = app.calls[3];
  assert.equal(geminiCall.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(geminiCall.headers["x-goog-api-key"], "test-value");
  assert.equal(geminiCall.headers["Api-Revision"], "2026-05-20");
  const geminiBody = app.calls[4];
  assert.equal(geminiBody.model, "gemini-3.6-flash");
  assert.match(geminiBody.system_instruction, /Eres el asistente de fichas/);
  assert.deepEqual(geminiBody.input, [
    { type: "user_input", content: [{ type: "text", text: "Crea el producto" }] },
  ]);
  assert.equal(geminiBody.response_format.mime_type, "application/json");
  assert.ok(!JSON.stringify(geminiBody).includes("2.5-flash"));
  assert.ok(!JSON.stringify(geminiBody).includes("generateContent"));
});

test("la respuesta de la Interactions API (steps) también se entiende", async () => {
  // Gemini a veces no rellena output_text: el texto va en steps.model_output.
  const app = endpoint({
    modelReply: async () =>
      Response.json({
        steps: [
          {
            type: "model_output",
            content: [
              {
                type: "text",
                text: JSON.stringify({ message: "Revisa la ficha", draft: product }),
              },
            ],
          },
        ],
      }),
  });
  const response = await app.invoke({
    action: "prepare",
    messages: [{ role: "user", content: "Crea el producto" }],
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).draft.name, product.name);
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
  // Sin llamada a Gemini: solo user_roles y el objeto de la llamada RPC.
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
  // Se llamó a Gemini (registra url/cabeceras/cuerpo) pero nunca a la RPC.
  assert.ok(app.calls.includes("gemini"));
  assert.ok(app.calls.every((c) => typeof c === "string" || !("name" in c)));
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
