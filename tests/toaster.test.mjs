import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
const unlock = readFileSync(new URL("../src/hooks/useAchievements.ts", import.meta.url), "utf8");

test("global toaster never renders over the fixed header", () => {
  // La cabecera es fija arriba: top-* taparía los botones de navegación.
  assert.match(root, /<Toaster[^>]*position="bottom-[a-z-]+"[^>]*\/>/);
  assert.doesNotMatch(root, /<Toaster[^>]*position="top-[a-z-]+"[^>]*\/>/);
});

test("achievement toast can be dismissed by the user", () => {
  assert.match(unlock, /toast\.success\(/);
  assert.match(unlock, /closeButton:\s*true/);
});
