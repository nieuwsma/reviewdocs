import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

test("packed toolkit operates from a repository-local consumer installation", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const temporary = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-package-"));
  const packed = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary, "--cache", path.join(temporary, "cache")], { cwd: root, encoding: "utf8" }))[0];
  for (const file of ["schemas/campaign.schema.json", "docs/usage.md", "templates/project/.agents/skills/system-reference/SKILL.md", "templates/project/.agents/skills/user-guide/SKILL.md"]) assert.ok(packed.files.some(f => f.path === file), `${file} must ship`);
  const consumer = path.join(temporary, "consumer");
  const installation = path.join(consumer, "tools/reviewdocs/node_modules/reviewdocs");
  await mkdir(installation, { recursive: true });
  execFileSync("tar", ["-xzf", path.join(temporary, packed.filename), "--strip-components=1", "-C", installation]);
  // Provide existing dependencies offline. Toolkit code/templates come only from the tarball.
  await symlink(path.join(root, "node_modules"), path.join(installation, "node_modules"));
  const binary = path.join(installation, "bin/reviewdocs.mjs");
  const run = args => execFileSync(process.execPath, [binary, ...args], { cwd: consumer, encoding: "utf8" });
  run(["init", "."]);
  run(["check"]);
  run(["verify"]);
  const before = await readFile(path.join(consumer, "reviewdocs.config.mjs"), "utf8");
  run(["upgrade", "--dry-run"]);
  assert.equal(await readFile(path.join(consumer, "reviewdocs.config.mjs"), "utf8"), before);
  assert.ok(JSON.parse(await readFile(path.join(consumer, ".reviewdocs/install.json"), "utf8")).files[".agents/skills/user-guide/SKILL.md"]);
});
