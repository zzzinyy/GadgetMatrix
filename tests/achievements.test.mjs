import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/achievements.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const achievements = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

const migration = readFileSync(
  new URL("../drizzle/migrations/0008_member_achievements.sql", import.meta.url),
  "utf8",
);

function seededCatalog() {
  const rows = [];
  const pattern =
    /^\s*\('([a-z_]+)', '([^']+)', '([^']+)', '([^']+)', '(route|profile|review|system)', (\d+)\)[,;]?$/gm;
  let match;
  while ((match = pattern.exec(migration)) !== null) {
    rows.push({
      id: match[1],
      emoji: match[2],
      title: match[3],
      description: match[4],
      kind: match[5],
      sortOrder: Number(match[6]),
    });
  }
  return rows;
}

test("client catalog mirrors the seeded database catalog", () => {
  const seeded = seededCatalog();
  assert.equal(seeded.length, achievements.achievementCatalog.length);
  assert.deepEqual(
    achievements.achievementCatalog.map(({ id, emoji, title, description, kind, sortOrder }) => ({
      id,
      emoji,
      title,
      description,
      kind,
      sortOrder,
    })),
    seeded,
  );
});

test("catalog entries are unique, ordered and renderable", () => {
  const ids = achievements.achievementCatalog.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  const orders = achievements.achievementCatalog.map((entry) => entry.sortOrder);
  assert.equal(new Set(orders).size, orders.length);
  assert.deepEqual(
    orders,
    [...orders].sort((a, b) => a - b),
  );
  for (const entry of achievements.achievementCatalog) {
    assert.match(entry.id, /^[a-z_]{3,40}$/);
    assert.ok(entry.emoji.length >= 1 && entry.emoji.length <= 8, entry.id);
    assert.ok(entry.title.trim().length > 0 && entry.description.trim().length > 0, entry.id);
    assert.ok(entry.hint.trim().length > 0, entry.id);
    assert.ok(["route", "profile", "review", "system"].includes(entry.kind), entry.id);
  }
});

test("every navigation achievement is reachable and only navigation achievements are", () => {
  const samples = [
    ["/productos", "explore_catalog"],
    ["/producto/auriculares-x", "product_explorer"],
    ["/comparador", "compare_devices"],
    ["/quiz", "quiz_master"],
    ["/top/mejores-moviles", "top_reader"],
    ["/chollos", "deal_hunter"],
    ["/blog/analisis-2026", "blog_reader"],
  ];
  const reached = new Set();
  for (const [path, expected] of samples) {
    assert.equal(achievements.achievementForPath(path), expected, path);
    reached.add(expected);
  }
  const navigationIds = achievements.achievementCatalog
    .filter((entry) => entry.kind === "route")
    .map((entry) => entry.id);
  assert.deepEqual([...reached].sort(), [...navigationIds].sort());
});

test("paths without achievement stay silent", () => {
  for (const path of [
    "/",
    "/auth",
    "/perfil",
    "/admin",
    "/sobre-nosotros",
    "/productos-inventados",
    "/blogueros",
  ]) {
    assert.equal(achievements.achievementForPath(path), undefined, path);
  }
});

test("paths ignore trailing slashes, query strings and hashes", () => {
  assert.equal(achievements.achievementForPath("/productos/"), "explore_catalog");
  assert.equal(achievements.achievementForPath("/quiz?modo=rapido"), "quiz_master");
  assert.equal(achievements.achievementForPath("/chollos#ofertas"), "deal_hunter");
  assert.equal(achievements.achievementForPath("/comparador?ids=a,b#tabla"), "compare_devices");
  assert.equal(achievements.achievementForPath(""), undefined);
});

test("progress ignores unknown ids and reports the next pending achievement", () => {
  const total = achievements.achievementCatalog.length;
  const empty = achievements.achievementProgress([]);
  assert.equal(empty.unlockedCount, 0);
  assert.equal(empty.total, total);
  assert.equal(empty.percent, 0);
  assert.equal(empty.rank.name, "Novato");
  assert.equal(empty.next.id, achievements.achievementCatalog[0].id);

  const withUnknown = achievements.achievementProgress(["explore_catalog", "inventado"]);
  assert.equal(withUnknown.unlockedCount, 1);
  assert.equal(withUnknown.next.id, "first_visit");

  const everything = achievements.achievementProgress(
    achievements.achievementCatalog.map((entry) => entry.id),
  );
  assert.equal(everything.unlockedCount, total);
  assert.equal(everything.percent, 100);
  assert.equal(everything.rank.name, "Leyenda");
  assert.equal(everything.next, undefined);
});

test("ranks grow with the number of achievements", () => {
  assert.equal(achievements.rankFor(0).name, "Novato");
  assert.equal(achievements.rankFor(2).name, "Novato");
  assert.equal(achievements.rankFor(3).name, "Explorador");
  assert.equal(achievements.rankFor(6).name, "Entendido");
  assert.equal(achievements.rankFor(9).name, "Gurú");
  assert.equal(achievements.rankFor(99).name, "Leyenda");
});

test("profile checklist matches the server rule (name and bio)", () => {
  assert.equal(achievements.isProfileComplete({ display_name: "Ada", bio: "Hola" }), true);
  assert.equal(achievements.isProfileComplete({ display_name: "Ada", bio: "   " }), false);
  assert.equal(achievements.isProfileComplete({ display_name: "  ", bio: "Hola" }), false);
  const pending = achievements.profileChecklist({ display_name: "Ada", bio: "" });
  assert.deepEqual(
    pending.map((item) => [item.id, item.done]),
    [
      ["display_name", true],
      ["bio", false],
    ],
  );
});

test("dates are formatted in UTC and never throw on bad input", () => {
  assert.equal(achievements.formatDay("2026-09-18"), "18 de septiembre de 2026");
  assert.equal(achievements.formatDay("2026-09-18T23:30:00.000Z"), "18 de septiembre de 2026");
  assert.equal(achievements.formatDay(null), undefined);
  assert.equal(achievements.formatDay(undefined), undefined);
  assert.equal(achievements.formatDay("no-es-una-fecha"), undefined);
});
