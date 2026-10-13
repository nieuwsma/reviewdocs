import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, cp, readdir, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildAll, checkAll, verifyAll, executeEvidence, initializeProject } from "../src/index.mjs";
import { adoptProject } from "../src/adopt.mjs";
import { loadConfig } from "../src/config.mjs";
import { validateCampaign, readCampaign } from "../src/campaign.mjs";
import { inputDigest, hash } from "../src/provenance.mjs";
import { validateScreenshots } from "../src/screenshots.mjs";
import { buildInventory } from "../src/inventory.mjs";
import { validateSite } from "../src/check.mjs";
import { projectAudience } from "../src/site.mjs";
import { exportDocs } from "../src/delivery.mjs";

const temp = () => mkdtemp(path.join(os.tmpdir(), "reviewdocs-capability-"));
const json = (filename, value) => writeFile(filename, JSON.stringify(value, null, 2));
async function config(root, value) { const filename = path.join(root, "reviewdocs.config.mjs"); await writeFile(filename, `export default ${JSON.stringify(value)}`); return filename; }
async function fixture() {
  const root = await temp();
  for (const dir of ["reference", "user"]) await mkdir(path.join(root, "docs", dir), { recursive: true });
  await writeFile(path.join(root, "docs/reference/README.md"), '# System\n\n[Task](../user/README.md#expected-result)\n');
  await writeFile(path.join(root, "docs/user/README.md"), '# Task\n\n## Expected result\n\n[System](../reference/README.md)\n');
  const cfg = { portable: true, landing: { outputDir: "docs/generated" }, collections: ["reference", "user"].map(id => ({ id, title: id, sourceDir: `docs/${id}`, outputDir: `docs/generated/${id}`, pages: [{ file: "README.md", output: "index.html" }] })) };
  return { root, cfg, filename: await config(root, cfg) };
}

test("link graph survives relocation and checks cross-collection anchors", async () => {
  const { root, filename } = await fixture();
  await checkAll(filename);
  const relocated = path.join(await temp(), "portal");
  await cp(path.join(root, "docs/generated"), relocated, { recursive: true });
  await validateSite(relocated, { portable: true, root: relocated });
  assert.match(await readFile(path.join(relocated, "reference/index.html"), "utf8"), /\.\.\/user\/index\.html#expected-result/);
  const page = path.join(relocated, "user/index.html");
  await writeFile(page, (await readFile(page, "utf8")).replace('id="expected-result"', 'id="other"'));
  await assert.rejects(() => validateSite(relocated), /missing fragment/);
});

test("read-only verify catches stale source and edited generated output", async () => {
  const { root, filename } = await fixture();
  await buildAll(filename); await verifyAll(filename);
  await writeFile(path.join(root, "docs/reference/README.md"), '# Changed\n');
  await assert.rejects(() => verifyAll(filename, { only: ["reference"] }), /stale inputs/);
  await buildAll(filename, { only: ["reference"] });
  await writeFile(path.join(root, "docs/generated/reference/site.css"), 'changed');
  await assert.rejects(() => verifyAll(filename, { only: ["reference"] }), /output was changed/);
});

test("adoption dry-run, managed upgrades and three-way conflicts preserve owned content", async () => {
  const root = await temp(), template = await temp();
  await mkdir(path.join(template, ".agents/skills/demo"), { recursive: true });
  const skill = ".agents/skills/demo/SKILL.md";
  await writeFile(path.join(template, skill), "one");
  await writeFile(path.join(template, "reviewdocs.config.mjs"), "incoming config");
  await writeFile(path.join(root, "reviewdocs.config.mjs"), "owned config");
  await adoptProject(root, { template, dryRun: true });
  assert.deepEqual(await readdir(root), ["reviewdocs.config.mjs"]);
  await adoptProject(root, { template });
  assert.equal(await readFile(path.join(root, "reviewdocs.config.mjs"), "utf8"), "owned config");
  await writeFile(path.join(template, skill), "two"); await adoptProject(root, { template });
  assert.equal(await readFile(path.join(root, skill), "utf8"), "two");
  await writeFile(path.join(root, skill), "local edit"); await writeFile(path.join(template, skill), "three");
  await adoptProject(root, { template });
  const proposal = JSON.parse(await readFile(path.join(root, `.reviewdocs/proposals/${skill}.json`), "utf8"));
  assert.deepEqual([proposal.base, proposal.local, proposal.incoming], ["two", "local edit", "three"]);
});

test("adoption refuses consumer symlinks", async () => {
  const root = await temp(), outside = await temp(), template = await temp();
  await mkdir(path.join(template, "docs")); await writeFile(path.join(template, "docs/index.md"), "incoming");
  await symlink(outside, path.join(root, "docs"));
  await assert.rejects(() => adoptProject(root, { template }), /symlink/);
  assert.deepEqual(await readdir(outside), []);
});

test("complete starter builds tracks, user guide and finite help", async () => {
  const root = await temp(); await initializeProject(root);
  const filename = path.join(root, "reviewdocs.config.mjs");
  await checkAll(filename); await verifyAll(filename);
  const help = await readFile(path.join(root, "docs/generated/help/index.html"), "utf8");
  assert.doesNotMatch(help, /href="[^"]*(?:maintenance|reference)/);
  assert.match(await readFile(path.join(root, "docs/generated/user/index.html"), "utf8"), /maintenance\.html/);
});

test("audience projection preserves procedural paragraphs", () => {
  const text = 'First\n\n:::audience contributor\nImplementation [source](../src.js)\n:::\n\nRequired step with a reference link.\n';
  assert.doesNotMatch(projectAudience(text, "user"), /Implementation/);
  assert.match(projectAudience(text, "user"), /Required step with a reference link/);
  assert.match(projectAudience(text), /Implementation/);
});

const baseline = () => ({ formatVersion: 1, id: "baseline", source: { description: "fixture" }, tracks: [{ id: "data" }], evidence: [{ id: "unit", status: "passed", proof: "mocked", description: "unit only", path: "unit.log" }], findings: [{ id: "F-1", title: "Lost state", track: "data", exitCondition: "state survives", history: [{ date: "2026-10-06", status: "open", severity: "high", confidence: "high", reason: "observed", evidence: ["unit"] }] }] });
test("repeat campaign cannot erase findings, rewrite history or invent fixed proof", () => {
  const old = baseline(), next = structuredClone(old); validateCampaign(old);
  next.findings[0].history.push({ ...next.findings[0].history[0], date: "2026-10-07", status: "fixed", reason: "verified" });
  validateCampaign(next, old);
  next.findings[0].history[0].reason = "rewritten";
  assert.throws(() => validateCampaign(next, old), /rewritten/);
  assert.throws(() => validateCampaign({ ...old, findings: [] }, old), /dropped/);
  next.findings[0].history.at(-1).evidence = [];
  assert.throws(() => validateCampaign(next), /fixed needs passing/);
});

test("inventory excludes nested generated/dependency mirrors", async () => {
  const root = await temp();
  for (const dir of ["deploy/kind/build/web/dist", "web/node_modules/pkg", "worker/.venv", "internal"]) await mkdir(path.join(root, dir), { recursive: true });
  for (const file of ["deploy/kind/build/web/dist/app.js", "web/node_modules/pkg/x.js", "worker/.venv/x.py", "internal/app.go"]) await writeFile(path.join(root, file), "one\n");
  const output = path.join(root, "inventory.json"); await buildInventory({ root, output });
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")).files.map(f => f.path), ["internal/app.go"]);
});

test("screenshot validation detects stale UI and unexplained files", async () => {
  const root = await temp(); await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "app.js"), "source"); await writeFile(path.join(root, "chapter.md"), '![Task](assets/task.png)');
  await writeFile(path.join(root, "assets/task.png"), "fixture bytes");
  const group = { id: "shots", assets: path.join(root, "assets"), manifest: path.join(root, "manifest.json"), inputs: ["app.js"] };
  await json(group.manifest, { formatVersion: 1, source: { inputHash: await inputDigest(root, group.inputs) }, mode: "synthetic renderer", viewport: { width: 1000, height: 700 }, screenshots: [{ file: "task.png", chapter: "chapter.md", alt: "Task form", sha256: hash("fixture bytes") }] });
  assert.equal(await validateScreenshots(group, root), 1);
  await writeFile(path.join(root, "assets/task.png"), "changed bytes");
  await assert.rejects(() => validateScreenshots(group, root), /screenshot changed/);
  await writeFile(path.join(root, "assets/task.png"), "fixture bytes");
  await writeFile(path.join(root, "assets/extra.png"), "extra");
  await assert.rejects(() => validateScreenshots(group, root), /unexplained/);
  await writeFile(path.join(root, "app.js"), "changed");
  await assert.rejects(() => validateScreenshots(group, root), /stale screenshot/);
});

test("explicit evidence retains failures without replacing passing baseline", async () => {
  const root = await temp();
  await writeFile(path.join(root, "producer.cjs"), `require('node:fs').writeFileSync(process.env.REVIEWDOCS_RUN_DIR+'/result.json',JSON.stringify({tests:1,passed:1,failed:0,skipped:0}));console.log('Bearer fake-token');`);
  const filename = await config(root, { collections: [], evidence: [{ id: "unit", cwd: ".", inputs: ["producer.cjs"], outputDir: "evidence/unit", proof: "mocked", command: [process.execPath, "producer.cjs"], outputs: ["result.json"], resultFile: "result.json", requireNoSkips: true }] });
  await assert.rejects(() => executeEvidence(filename), /requires --only/);
  const [pass] = await executeEvidence(filename, { only: ["unit"] }); assert.equal(pass.status, "passed");
  const pointer = await readFile(path.join(root, "evidence/unit/latest.json"), "utf8");
  assert.doesNotMatch(await readFile(path.join(root, "evidence/unit", JSON.parse(pointer).run, "command.log"), "utf8"), /fake-token/);
  await verifyAll(filename, { only: ["unit"] });
  await writeFile(path.join(root, "producer.cjs"), "process.exit(1)");
  const [fail] = await executeEvidence(filename, { only: ["unit"] }); assert.equal(fail.status, "failed");
  assert.equal(await readFile(path.join(root, "evidence/unit/latest.json"), "utf8"), pointer);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, "evidence/unit/index.json"), "utf8")).map(run => run.status), ["passed", "failed"]);
  await assert.rejects(() => verifyAll(filename, { only: ["unit"] }), /stale/);
});

test("config rejects source/output overlap and unpublished topics", async () => {
  const { root, cfg } = await fixture(); cfg.collections[0].outputDir = "docs";
  let filename = await config(root, cfg); await assert.rejects(() => loadConfig(filename), /overlap/);
  cfg.collections[0].outputDir = "docs/generated/reference"; cfg.collections[0].topics = [{ id: "domain", page: "missing.md" }];
  filename = await config(root, cfg); await assert.rejects(() => loadConfig(filename), /unpublished/);
});

test("export is relocatable and refuses overwrite", async () => {
  const { filename } = await fixture(); await buildAll(filename);
  const loaded = await loadConfig(filename), destination = path.join(await temp(), "bundle");
  await writeFile(path.join(loaded.landing.outputDir,"unlinked.html"),"private report");
  const {publishedFiles}=await import("../src/publication.mjs");
  assert.equal((await publishedFiles(loaded.landing.outputDir)).has("unlinked.html"),false);
  await exportDocs(loaded, destination); await validateSite(destination, { root: destination, portable: true });
  await assert.rejects(()=>readFile(path.join(destination,"unlinked.html")),/ENOENT/);
  await assert.rejects(() => exportDocs(loaded, destination), /exists/);
});

test("a no-skip lane cannot pass when the result omits skip accounting", async () => {
  const root = await temp();
  await writeFile(path.join(root, "producer.cjs"), "require('node:fs').writeFileSync(process.env.REVIEWDOCS_RUN_DIR+'/result.json',JSON.stringify({tests:1,passed:1,failed:0}))");
  const filename = await config(root, { collections: [], evidence: [{ id: "unit", inputs: ["producer.cjs"], outputDir: "evidence/unit", proof: "mocked", command: [process.execPath, "producer.cjs"], resultFile: "result.json", requireNoSkips: true }] });
  const [result] = await executeEvidence(filename, { only: ["unit"] });
  assert.equal(result.status, "partial");
  await assert.rejects(() => readFile(path.join(root, "evidence/unit/latest.json")), /ENOENT/);
});

test("strict campaigns require authored analysis of each canonical finding", async () => {
  const root = await temp(), ledger = baseline();
  ledger.tracks[0].report = "data.md";
  await json(path.join(root, "campaign.json"), ledger);
  await writeFile(path.join(root, "data.md"), "# Data\n\nUnrelated analysis of F-10.");
  await assert.rejects(() => readCampaign({ source: path.join(root, "campaign.json"), strictNarrative: true }), /F-1: missing authored/);
  await writeFile(path.join(root, "data.md"), "# Data\n\nF-1 traces lost state through the fixture.");
  assert.equal((await readCampaign({ source: path.join(root, "campaign.json"), strictNarrative: true })).findings.length, 1);
});

test("portable profiles reject machine links and output paths through symlinks", async () => {
  const { root, filename } = await fixture();
  await writeFile(path.join(root, "docs/reference/README.md"), '# System\n\n[Machine](file:///Users/example/private.html)');
  await assert.rejects(() => buildAll(filename), /nonportable/);
  const outside = await temp(); await symlink(outside, path.join(root, "linked"));
  const unsafe = await config(root, { collections: [{ id: "reference", title: "System", sourceDir: "docs/reference", outputDir: "linked/output", pages: [{ file: "README.md" }] }] });
  await assert.rejects(() => loadConfig(unsafe), /symlink/);
  assert.deepEqual(await readdir(outside), []);
});

test("extra producer inputs cannot replace a collection's intrinsic source inputs", async () => {
  const { root, cfg } = await fixture();
  await writeFile(path.join(root, "extra.js"), "producer input");
  cfg.collections[0].inputs = ["extra.js"];
  const filename = await config(root, cfg);
  await buildAll(filename);
  await writeFile(path.join(root, "docs/reference/README.md"), "# Changed reference");
  await assert.rejects(() => verifyAll(filename, { only: ["reference"] }), /stale inputs/);
});
