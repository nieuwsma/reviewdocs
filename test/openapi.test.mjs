import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildOpenApi, validateOpenApi } from "../src/openapi.mjs";

test("builds a self-contained offline OpenAPI browser", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-api-"));
  const source = path.join(root, "openapi.json");
  const outputDir = path.join(root, "output");
  await writeFile(source, JSON.stringify({ openapi: "3.1.0", info: { title: "Test API", version: "1" }, paths: { "/things": { get: { responses: { "200": { description: "ok", content: { "application/json": { schema: { "$ref": "#/components/schemas/Thing" } } } } } } } }, components: { schemas: { Thing: { type: "object", properties: { id: { type: "string" } } } } } }));
  const document = { id: "api", source, outputDir };
  await buildOpenApi(document);
  await validateOpenApi(document);
  const html = await readFile(path.join(outputDir, "index.html"), "utf8");
  const embedded = html.match(/<script id="openapi"[\s\S]*?<\/script>/)?.[0];
  assert.ok(embedded);
  assert.doesNotMatch(embedded, /"\$ref"/);
  assert.match(html, /replaced on every build/);
  assert.match(html, /Edit that source/);
  assert.match(html, /openapi\.json/);
});

test("reads an OpenAPI YAML source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "reviewdocs-api-yaml-"));
  const source = path.join(root, "openapi.yaml");
  const outputDir = path.join(root, "output");
  await writeFile(source, "openapi: 3.0.3\ninfo:\n  title: YAML API\n  version: \"1\"\npaths:\n  /health:\n    get:\n      responses:\n        \"200\":\n          description: ok\n");
  const document = { id: "api", source, outputDir };
  await buildOpenApi(document);
  await validateOpenApi(document);
  const generated = JSON.parse((await readFile(path.join(outputDir, "index.html"), "utf8")).match(/<script id="openapi" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(generated.info.title, "YAML API");
  assert.equal(generated.paths["/health"].get.responses["200"].description, "ok");
});
