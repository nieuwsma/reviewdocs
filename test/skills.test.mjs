import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "yaml";

test("packaged authoring skills have valid identities and resolvable references", async () => {
  const root = fileURLToPath(new URL("../templates/project/.agents/skills/", import.meta.url));
  for (const name of ["system-reference", "evidence-review", "user-guide"]) {
    const directory = path.join(root, name);
    const text = await readFile(path.join(directory, "SKILL.md"), "utf8");
    const metadata = parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
    assert.equal(metadata.name, name);
    assert.ok(typeof metadata.description === "string" && metadata.description.length <= 1024);
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) assert.ok((await stat(path.resolve(directory, target))).isFile());
  }
});
