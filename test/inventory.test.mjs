import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildInventory } from "../src/inventory.mjs";

test("inventories first-party source and separates tests", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-inventory-"));
  await mkdir(path.join(root, "test"));
  await mkdir(path.join(root, "node_modules"));
  await writeFile(path.join(root, "main.js"), "const value = 1;\n\nexport { value };\n");
  await writeFile(path.join(root, "test", "main.test.js"), "test('x', () => {});\n");
  await writeFile(path.join(root, "node_modules", "dependency.js"), "ignored();\n");
  const output = path.join(root, "docs", "generated", "inventory.json");
  await buildInventory({ root, output });
  const inventory = JSON.parse(await readFile(output, "utf8"));
  assert.equal(inventory.totals.files, 2);
  assert.equal(inventory.totals.testNonblank, 1);
});

test('physical counts handle empty files, final newlines, comments and type/test splits', async () => {
 const root=await mkdtemp(path.join(os.tmpdir(),'reviewdocs-counts-'));
 await mkdir(path.join(root,'tests'));
 await writeFile(path.join(root,'main.go'),'// comment\npackage main\n\n');
 await writeFile(path.join(root,'empty.go'),'');
 await writeFile(path.join(root,'tests/main_test.go'),'package main');
 const output=path.join(root,'out.json');await buildInventory({root,output,extensions:['.go']});
 const report=JSON.parse(await readFile(output,'utf8'));
 assert.equal(report.totals.lines,4);assert.equal(report.totals.nonblank,3);
 assert.equal(report.languages.go.files,3);assert.equal(report.languages.go.testNonblank,1);
 assert.equal(report.categories.productionAndTooling.nonblank,2);
 assert.equal(report.categories.tests.lines,1);
});
