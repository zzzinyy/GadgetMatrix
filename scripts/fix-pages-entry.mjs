import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
      }),
    )
  ).flat();
}

export async function fixPagesEntry(output = resolve(".output")) {
  const publicDir = resolve(output, "public");
  const serverFiles = await filesUnder(resolve(output, "server"));
  const candidates = new Set();
  for (const file of serverFiles) {
    if (!/[/\\]_tanstack-start-manifest[^/\\]*\.mjs$/.test(file)) continue;
    const { tsrStartManifest } = await import(pathToFileURL(file).href);
    if (typeof tsrStartManifest !== "function") continue;
    const manifest = await tsrStartManifest();
    for (const script of manifest.routes?.__root__?.scripts ?? []) {
      const src = script.attrs?.src;
      if (typeof src === "string" && src.startsWith("/GadgetMatrix/assets/") && src.endsWith(".js"))
        candidates.add(src);
    }
  }
  if (candidates.size !== 1)
    throw new Error(`Expected exactly one production client entry, found ${candidates.size}`);
  const [entry] = candidates;
  const entryFile = resolve(publicDir, entry.slice("/GadgetMatrix/".length));
  if (relative(publicDir, entryFile).startsWith(`..${sep}`))
    throw new Error("Entry outside public directory");
  const code = await readFile(entryFile, "utf8");
  if (!code.includes("hydrateRoot"))
    throw new Error("Manifest entry does not contain React hydration");
  const publicFiles = await filesUnder(publicDir);
  let changed = 0;
  for (const file of publicFiles.filter((f) => f.endsWith(".html"))) {
    const html = await readFile(file, "utf8");
    const fixed = html.replaceAll(
      "/GadgetMatrix/@id/virtual:tanstack-start-dev-client-entry",
      entry,
    );
    if (fixed !== html) {
      await writeFile(file, fixed);
      changed++;
    }
  }
  for (const file of publicFiles.filter((f) => /\.(html|js)$/.test(f))) {
    const text = await readFile(file, "utf8");
    if (/virtual:tanstack-start-dev-client-entry|\/@id\//.test(text))
      throw new Error(`Development reference remains: ${file}`);
  }
  console.log(`Verified client entry: ${entry}; HTML files repaired: ${changed}`);
  return entry;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await fixPagesEntry();
}
