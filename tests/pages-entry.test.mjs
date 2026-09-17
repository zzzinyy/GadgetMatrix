import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixPagesEntry } from "../scripts/fix-pages-entry.mjs";

const DEV_ENTRY = "/GadgetMatrix/@id/virtual:tanstack-start-dev-client-entry";

async function writeFixture(root, { scripts, entryCode = "hydrateRoot(document)" }) {
  const assets = `${root}/public/assets`;
  await mkdir(assets, { recursive: true });
  await mkdir(`${root}/server/_ssr`, { recursive: true });
  await writeFile(
    `${root}/server/_tanstack-start-manifest_v.mjs`,
    `var tsrStartManifest = () => ({ routes: { __root__: { scripts: [{ attrs: { type: "module", src: ${JSON.stringify(scripts[0])} } }] } } });\nexport { tsrStartManifest };\n`,
  );
  const entry = scripts[0].replace("/GadgetMatrix/", "");
  await writeFile(`${root}/public/${entry}`, entryCode);
  const html = `<html><body><script type="module" async src="${DEV_ENTRY}"></script></body></html>`;
  await writeFile(`${root}/public/index.html`, html);
  await writeFile(`${root}/public/404.html`, html);
  return html;
}

test("fixPagesEntry rewrites HTML to the manifest-declared production entry", async () => {
  const root = fileURLToPath(new URL("./tmp/entry-ok/", import.meta.url));
  try {
    await writeFixture(root, { scripts: ["/GadgetMatrix/assets/index-D4y-nQPx.js"] });
    const entry = await fixPagesEntry(root);
    assert.equal(entry, "/GadgetMatrix/assets/index-D4y-nQPx.js");
    const html = await readFile(`${root}/public/index.html`, "utf8");
    assert.match(html, /src="\/GadgetMatrix\/assets\/index-D4y-nQPx\.js"/);
    assert.ok(!html.includes("virtual:tanstack-start-dev-client-entry"));
    assert.ok(!html.includes("/@id/"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fixPagesEntry fails loudly on the largest-bundle heuristic trap", async () => {
  const root = fileURLToPath(new URL("./tmp/entry-trap/", import.meta.url));
  try {
    await writeFixture(root, {
      scripts: ["/GadgetMatrix/assets/Match-CY9q4FRH.js"],
      entryCode: "no hydration here",
    });
    await assert.rejects(() => fixPagesEntry(root), /does not contain React hydration/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fixPagesEntry fails when the manifest still points to the dev entry", async () => {
  const root = fileURLToPath(new URL("./tmp/entry-dev/", import.meta.url));
  try {
    await mkdir(`${root}/server`, { recursive: true });
    await writeFile(
      `${root}/server/_tanstack-start-manifest_v.mjs`,
      `var tsrStartManifest = () => ({ routes: { __root__: { scripts: [{ attrs: { src: ${JSON.stringify(DEV_ENTRY)} } }] } } });\nexport { tsrStartManifest };\n`,
    );
    await assert.rejects(() => fixPagesEntry(root), /Expected exactly one production client entry/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
