import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("favicon SVG is self-contained and has a square viewBox", async () => {
  const svg = await readFile(new URL("public/favicon.svg", root), "utf8");
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.match(svg, /<title>GadgetMatrix<\/title>/);
  assert.match(svg, /<path\s/);
  assert.match(svg, /#67E8F9/);
  assert.match(svg, /#A3E635/);
  assert.doesNotMatch(svg, /<script|<image|<foreignObject|href=/i);
});

test("root uses the SVG favicon under the deployment base path", async () => {
  const source = await readFile(new URL("src/routes/__root.tsx", root), "utf8");
  assert.ok(source.includes("${import.meta.env.BASE_URL}favicon.svg?v=2"));
  assert.match(source, /type: "image\/svg\+xml"/);
  assert.doesNotMatch(source, /favicon\.ico|apple-touch-icon/);
});
