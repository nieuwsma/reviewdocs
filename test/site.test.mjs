import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildCollection } from "../src/site.mjs";
import { assertDeterministic, validateSite } from "../src/check.mjs";

test("builds a deterministic linked Markdown collection", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-site-"));
  const source = path.join(root, "source");
  const output = path.join(root, "output");
  await mkdir(path.join(source, "assets"), { recursive: true });
  await writeFile(path.join(source, "README.md"), "# Start\n\nRead [details](details.md#verified) and view ![diagram](assets/example.svg).\n");
  await writeFile(path.join(source, "details.md"), "# Details\n\n## Verified\n\nEvidence.\n");
  await writeFile(path.join(source, "assets", "example.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n");
  const collection = { id: "test", title: "Test", sourceDir: source, outputDir: output, assets: ["assets"], pages: [{ file: "README.md", output: "index.html", label: "Start" }, { file: "details.md", label: "Details" }] };
  await buildCollection(collection);
  assert.equal(await validateSite(output), 2);
  await assertDeterministic(output, () => buildCollection(collection));
  assert.match(await readFile(path.join(output, "index.html"), "utf8"), /details\.html#verified/);
});

test("reports broken local links", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-broken-"));
  await writeFile(path.join(root, "index.html"), '<a href="missing.html">broken</a>');
  await assert.rejects(() => validateSite(root), /missing missing\.html/);
});
