import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initializeProject } from "../src/init.mjs";

test("initializes a reference, review, CI workflow, and agent protocol", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-init-"));
  const destination = path.join(parent, "project");
  await initializeProject(destination);
  assert.match(await readFile(path.join(destination, "docs", "review", "findings-register.md"), "utf8"), /Findings register/);
  assert.match(await readFile(path.join(destination, ".agents", "skills", "evidence-review", "SKILL.md"), "utf8"), /evidence-backed engineering review/i);
});

test("preserves unrelated files in an established repository", async () => {
  const destination = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-init-nonempty-"));
  await writeFile(path.join(destination, "owned.txt"), "keep\n");
  await initializeProject(destination);
  assert.equal(await readFile(path.join(destination, "owned.txt"), "utf8"), "keep\n");
});

test("refuses to replace a starter file without force", async () => {
  const destination = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-init-conflict-"));
  await writeFile(path.join(destination, "reviewdocs.config.mjs"), "owned\n");
  await assert.rejects(() => initializeProject(destination), /already exists/);
});
