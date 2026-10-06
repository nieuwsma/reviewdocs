import { pathToFileURL } from "node:url";
import path from "node:path";
import { inside, safePath, outputName } from "./paths.mjs";
import { lstat, readFile } from "node:fs/promises";
let loadSequence = 0;

export async function loadConfig(filename) {
  const absolute = path.resolve(filename);
  const imported = await import(`${pathToFileURL(absolute).href}?loaded=${Date.now()}-${++loadSequence}`);
  const config = imported.default;
  if (!config || typeof config !== "object") throw new Error(`${filename} must export a configuration object as default`);
  const root = path.dirname(absolute);
  const resolve = value => path.resolve(root, value);
  const collections = (config.collections ?? []).map(collection => ({
    ...collection,
    sourceDir: resolve(collection.sourceDir),
    outputDir: resolve(collection.outputDir),
    glossary: collection.glossary ? resolve(collection.glossary) : undefined,
  }));
  const diagrams = (config.diagrams ?? []).map(group => ({ ...group, sourceDir: resolve(group.sourceDir), outputDir: resolve(group.outputDir) }));
  const openapi = (config.openapi ?? []).map(document => ({ ...document, source: resolve(document.source), outputDir: resolve(document.outputDir) }));
  const inventory = config.inventory ? {
    ...config.inventory,
    root: resolve(config.inventory.root ?? "."),
    output: resolve(config.inventory.output),
  } : undefined;
  const databaseDocs = config.databaseDocs ? {
    ...config.databaseDocs,
    outputDir: resolve(config.databaseDocs.outputDir),
    temporaryRoot: resolve(config.databaseDocs.temporaryRoot ?? ".local"),
  } : undefined;
  const evidence = (config.evidence ?? []).map(lane => ({ ...lane, cwd: resolve(lane.cwd ?? "."), outputDir: resolve(lane.outputDir) }));
  const campaign = config.campaign ? { ...config.campaign, source: resolve(config.campaign.source), previous: config.campaign.previous ? resolve(config.campaign.previous) : undefined, outputDir: resolve(config.campaign.outputDir) } : undefined;
  if (campaign) {
    const ledger = JSON.parse(await readFile(campaign.source, "utf8"));
    campaign.evidenceInputs = (ledger.evidence ?? []).filter(e => e.path).map(e => { safePath(root, e.path); return e.path; });
    campaign.evidenceInputs.push(...(ledger.tracks ?? []).filter(t => t.report).map(t => {
      const report = safePath(path.dirname(campaign.source), t.report);
      if (!collections.some(c => c.pages.some(p => path.resolve(c.sourceDir, p.file) === report))) throw new Error(`${t.id}: authored track report is not published`);
      return path.relative(root, report);
    }));
  }
  const screenshots = (config.screenshots ?? []).map(group => ({ ...group, manifest: resolve(group.manifest), assets: resolve(group.assets) }));
  const landing = config.landing ? { ...config.landing, portal: true, id: config.landing.id ?? "portal", outputDir: resolve(config.landing.outputDir) } : undefined;
  const presentation = config.presentation ? { ...config.presentation, module: safePath(root, config.presentation.module), assets: safePath(root, config.presentation.assets) } : undefined;
  if (landing && presentation) landing.presentationAssets = "_presentation";
  if (presentation) {
    await assertNoSymlink(root, presentation.module);
    await assertNoSymlink(root, presentation.assets);
  }
  const result = { ...config, presentation, filename: absolute, root, collections, diagrams, openapi, inventory, databaseDocs, evidence, campaign, screenshots, landing };
  result.artifacts = [...diagrams, ...(inventory ? [{ ...inventory, id: inventory.id ?? "inventory" }] : []), ...openapi, ...(databaseDocs ? [Object.assign(databaseDocs, { id: databaseDocs.id ?? "database" })] : []), ...(campaign ? [campaign] : []), ...collections, ...(landing ? [landing] : [])];
  if (presentation) {
    for (const artifact of result.artifacts) {
      const output = artifact.outputDir ?? artifact.output;
      for (const source of [presentation.module, presentation.assets]) if (inside(output, source) || inside(source, output)) throw new Error('presentation source/output overlap');
      if (artifact.outputDir && (collections.includes(artifact) || artifact === landing || artifact === campaign)) await assertNoSymlink(root, path.join(artifact.outputDir, '_presentation'));
      if (landing && artifact !== landing && inside(path.join(landing.outputDir, '_presentation'), output)) throw new Error('artifact overlaps reserved presentation output');
    }
  }
  for (const collection of collections) {
    const pages = await Promise.all((collection.pages??[]).map(p=>readFile(safePath(collection.sourceDir,p.file),'utf8')));
    if (pages.some(text=>text.includes('{{inventory-report}}'))) {
      if (!inventory) throw new Error(`${collection.id}: inventory-report needs inventory configuration`);
      collection.dependsOn = [...new Set([...(collection.dependsOn??[]), inventory.id??'inventory'])];
    }
  }
  const byId = new Map(result.artifacts.map(a=>[a.id,a]));
  const active = new Set(), finished = new Set();
  function dependencies(a) {
    if (active.has(a.id)) throw new Error(`artifact dependency cycle: ${a.id}`);
    if (finished.has(a.id)) return;
    active.add(a.id);
    for (const id of a.dependsOn??[]) {
      if (!byId.has(id)) throw new Error(`${a.id}: unknown dependency ${id}`);
      dependencies(byId.get(id));
    }
    active.delete(a.id); finished.add(a.id);
  }
  for (const a of result.artifacts) dependencies(a);
  const ids = new Set();
  for (const artifact of [...result.artifacts, ...evidence]) {
    if (!/^[a-z][a-z0-9-]*$/.test(artifact.id) || ids.has(artifact.id)) throw new Error(`invalid or duplicate artifact id: ${artifact.id}`);
    ids.add(artifact.id);
    const output = artifact.outputDir ?? artifact.output;
    if (!output || !inside(root, output) || output === root) throw new Error(`${artifact.id}: output must be below project root`);
    await assertNoSymlink(root, output);
    for (const source of [artifact.sourceDir, artifact.source, artifact.glossary].filter(Boolean)) {
      if (!inside(root, source) || inside(output, source) || inside(source, output)) throw new Error(`${artifact.id}: source/output overlap or source outside root`);
    }
    artifact.inputs = [...new Set([path.relative(root, absolute), ...inferInputs(result, artifact), ...(presentation && (collections.includes(artifact) || artifact === landing || artifact === campaign) ? [path.relative(root, presentation.module), path.relative(root, presentation.assets), ...(presentation.inputs ?? [])] : []), ...(artifact.inputs ?? [])])];
    for (const input of artifact.inputs) safePath(root, input);
  }
  for (const artifact of [...result.artifacts, ...evidence]) artifact.inputExclude = [...(artifact.exclude ?? []), ".reviewdocs", ...[...result.artifacts, ...evidence].flatMap(a => a.outputDir ? [path.relative(root, a.outputDir)] : [path.relative(root, a.output), `${path.relative(root, a.output)}.provenance.json`])];
  for (const [i, a] of [...result.artifacts, ...evidence].entries()) for (const b of [...result.artifacts, ...evidence].slice(i + 1)) {
    const ap = a.outputDir ?? a.output, bp = b.outputDir ?? b.output;
    if (inside(ap, bp) || inside(bp, ap)) {
      // A portal may contain other artifacts, but only writes its own index/manifest.
      if (a === landing && inside(ap, bp) || b === landing && inside(bp, ap)) continue;
      throw new Error(`overlapping outputs: ${a.id}, ${b.id}`);
    }
  }
  for (const collection of collections) {
    collection.portable ??= config.portable ?? false;
    if (!collection.title || !collection.pages?.length) throw new Error(`${collection.id}: title and pages required`);
    const outputs = new Set();
    for (const page of collection.pages) {
      safePath(collection.sourceDir, page.file);
      safePath(collection.outputDir, outputName(page));
      if (!outputName(page).endsWith(".html") || outputs.has(outputName(page))) throw new Error(`${collection.id}: invalid/duplicate page output`);
      if (presentation && outputName(page).split(/[\\/]/)[0] === "_presentation") throw new Error(`${collection.id}: reserved presentation output`);
      outputs.add(outputName(page));
    }
    for (const asset of collection.assets ?? []) safePath(collection.sourceDir, asset);
    for (const topic of collection.topics ?? []) if (!topic.page && !topic.omitted) throw new Error(`${collection.id}: topic ${topic.id} needs page or omission reason`);
    for (const topic of collection.topics ?? []) if (topic.page && !collection.pages.some(p => p.file === topic.page)) throw new Error(`${collection.id}: topic ${topic.id} points to unpublished page`);
    const reserved = ["site.css", "site.js", "_presentation", ".reviewdocs-provenance.json"];
    for (const asset of collection.assets ?? []) if (presentation && asset.split(/[\\/]/)[0] === "_presentation" || collection.pages.some(p => inside(path.resolve(collection.outputDir, asset), path.resolve(collection.outputDir, outputName(p)))) || reserved.includes(asset)) throw new Error(`${collection.id}: asset/page collision`);
  }
  result.artifacts = result.artifacts.map(a => a.id === inventory?.id || inventory && a.output === inventory.output ? Object.assign(inventory, a) : a);
  if (campaign) Object.assign(campaign, result.artifacts.find(a => a.id === campaign.id));
  if (databaseDocs) Object.assign(databaseDocs, result.artifacts.find(a => a.id === (databaseDocs.id ?? "database")));
  for (const lane of evidence) {
    if (!Array.isArray(lane.command) || !lane.command.length || !["source read", "mocked", "integration", "canary", "deployment", "manual"].includes(lane.proof)) throw new Error(`${lane.id}: evidence requires command array and proof boundary`);
    if (!(lane.inputs?.length > 1)) throw new Error(`${lane.id}: declare production inputs for evidence`);
    if (!inside(root, lane.cwd)) throw new Error(`${lane.id}: cwd outside project`);
    if (lane.timeoutMs !== undefined && (!Number.isFinite(lane.timeoutMs) || lane.timeoutMs <= 0)) throw new Error(`${lane.id}: invalid timeoutMs`);
    for (const output of [...(lane.outputs ?? []), ...(lane.resultFile ? [lane.resultFile] : [])]) safePath(lane.outputDir, output);
  }
  for (const group of screenshots) {
    if (!group.id || !group.inputs?.length) throw new Error("screenshots require id and production inputs");
    for (const input of group.inputs) safePath(root, input);
    if (!inside(root, group.manifest) || !inside(root, group.assets)) throw new Error(`${group.id}: screenshot paths outside root`);
  }
  return result;
}

export async function assertNoSymlink(root, target) {
  let current = root;
  for (const segment of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let metadata;
    try { metadata = await lstat(current); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (metadata.isSymbolicLink()) throw new Error(`refusing output through symlink: ${current}`);
  }
}

function inferInputs(config, artifact) {
  const relative = value => path.relative(config.root, value);
  if (artifact === config.landing) return config.collections.flatMap(c => c.pages.map(p => relative(path.join(c.sourceDir, p.file))));
  if (artifact.sourceDir && artifact.pages) return [...artifact.pages.map(p => relative(path.join(artifact.sourceDir, p.file))), ...(artifact.assets ?? []).map(a => relative(path.join(artifact.sourceDir, a))), ...(artifact.glossary ? [relative(artifact.glossary)] : []), ...(config.campaign ? [relative(config.campaign.source)] : [])];
  if (artifact.sourceDir) return [relative(artifact.sourceDir)];
  if (artifact.source) return [relative(artifact.source), ...(artifact.previous ? [relative(artifact.previous)] : []), ...(artifact.evidenceInputs ?? [])];
  // Inventory and database/evidence generators must declare production input roots.
  if (artifact.output && artifact.root) return artifact.include ?? [relative(artifact.root) || "."];
  // Legacy configurations still build; strict freshness cannot certify their producer.
  if (artifact.databases) { if (!artifact.inputs?.length) console.warn("database docs have no producer inputs; configure migration roots for qualified freshness"); return []; }
  return [];
}

export function artifactSelected(id, only) {
  return only.length === 0 || only.includes(id);
}
