import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";

async function load(responses) {
  const source = readFileSync(new URL("../src/lib/member.ts", import.meta.url), "utf8").replace(
    /^import .*;\r?\n/gm,
    "",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(`let supabase,z; const queryOptions=x=>x; export const setup=(a,b)=>{supabase=a;z=b};\n${code.replace("export const profileSchema = z.object", "export const schemaFactory = () => z.object").replace("profileSchema.parse(input)", "schemaFactory().parse(input)")}`).toString("base64")}`
  );
  const calls = [];
  module.setup(
    {
      rpc: async (...args) => {
        calls.push(["rpc", ...args]);
        return responses.shift();
      },
      from: (table) => {
        calls.push(["from", table]);
        const chain = {};
        for (const method of ["select", "eq", "single", "abortSignal", "update"])
          chain[method] = (...args) => {
            calls.push([method, ...args]);
            return chain;
          };
        chain.then = (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject);
        return chain;
      },
    },
    z,
  );
  return { module, calls };
}

test("member query is disabled anonymously and sends no caller-supplied identity to visit RPC", async () => {
  const { module, calls } = await load([
    { data: false },
    { data: { user_id: "one" } },
    { data: [] },
  ]);
  assert.equal(module.memberQuery(undefined).enabled, false);
  const result = await module.memberQuery("one").queryFn({ signal: new AbortController().signal });
  assert.equal(result.profile.user_id, "one");
  assert.deepEqual(calls[0], ["rpc", "record_member_visit"]);
  assert.equal(calls.filter((c) => c[0] === "eq" && c[2] === "one").length, 2);
});

test("visit errors are surfaced instead of fake achievements", async () => {
  const { module, calls } = await load([{ error: new Error("Unavailable") }]);
  await assert.rejects(
    module.memberQuery("one").queryFn({ signal: new AbortController().signal }),
    /Unavailable/,
  );
  assert.equal(calls.length, 1);
});

test("profile save validates and only writes editable fields", async () => {
  const { module, calls } = await load([{ data: { display_name: "Ada" } }]);
  await assert.rejects(module.saveProfile("one", { display_name: "", bio: "", avatar: "bad" }));
  assert.equal(calls.length, 0);
  await module.saveProfile("one", {
    display_name: " Ada ",
    bio: "",
    avatar: "robot",
    user_id: "other",
    role: "admin",
  });
  assert.deepEqual(calls.find((c) => c[0] === "update")[1], {
    display_name: "Ada",
    bio: "",
    avatar: "robot",
  });
  assert.ok(calls.some((c) => c[0] === "eq" && c[2] === "one"));
});
