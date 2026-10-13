import {assertNoSymlink} from "./filesystem-guards.mjs";
export {assertNoSymlink} from "./filesystem-guards.mjs";
import {validateProducerSettings} from "./config-validation.mjs";
import {selectArtifacts} from "./plan.mjs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { inside, safePath, outputName } from "./paths.mjs";
import { readFile } from "node:fs/promises";
let loadSequence = 0;

export async function loadConfig(filename, {only = [], inspect = false} = {}) {
  const absolute = path.resolve(filename);
  const imported = await import(`${pathToFileURL(absolute).href}?loaded=${Date.now()}-${++loadSequence}`);
  const config = imported.default;
  if (!config || typeof config !== "object") throw new Error(`${filename} must export a configuration object as default`);
  const root = path.dirname(absolute);
  const resolve = value => path.resolve(root, value);
  const stateDir = resolve(config.stateDir ?? ".reviewdocs");
  if (!inside(root,stateDir) || stateDir===root) throw new Error("stateDir must be below project root");
  await assertNoSymlink(root,stateDir);
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
    let ledger;try {ledger = JSON.parse(await readFile(campaign.source, "utf8"));} catch(error) {if(!inspect)throw error;ledger={}; campaign.inspectionError=error.message;}
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
  const result = { ...config, stateDir, presentation, filename: absolute, root, collections, diagrams, openapi, inventory, databaseDocs, evidence, campaign, screenshots, landing };
  result.artifacts = [...diagrams, ...(inventory ? [{ ...inventory, id: inventory.id ?? "inventory" }] : []), ...openapi, ...(databaseDocs ? [Object.assign(databaseDocs, { id: databaseDocs.id ?? "database" })] : []), ...(campaign ? [campaign] : []), ...collections, ...(landing ? [landing] : [])];
  if(landing) landing.dependsOn=[...new Set([...(landing.dependsOn??[]),...result.artifacts.filter(a=>a!==landing && a.outputDir && inside(landing.outputDir,a.outputDir)).map(a=>a.id)])];
  if (presentation) {
    for (const artifact of result.artifacts) {
      const output = artifact.outputDir ?? artifact.output;
      for (const source of [presentation.module, presentation.assets]) if (inside(output, source) || inside(source, output)) throw new Error('presentation source/output overlap');
      if (artifact.outputDir && (collections.includes(artifact) || artifact === landing || artifact === campaign)) await assertNoSymlink(root, path.join(artifact.outputDir, '_presentation'));
      if (landing && artifact !== landing && inside(path.join(landing.outputDir, '_presentation'), output)) throw new Error('artifact overlaps reserved presentation output');
    }
  }
  for (const collection of collections) {
    if (only.length && !only.includes(collection.id) && !result.artifacts.some(a=>only.includes(a.id) && (a.dependsOn??[]).includes(collection.id))) continue;
    const pages = await Promise.all((collection.pages??[]).map(async p=>{try{return await readFile(safePath(collection.sourceDir,p.file),'utf8');}catch(error){if(!inspect)throw error;return '';}}));
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
  for (const artifact of result.artifacts) artifact.provenanceFile=path.join(stateDir,"provenance",`${artifact.id}.json`);
  for (const publicRoot of result.artifacts.filter(a=>a.outputDir).map(a=>a.outputDir)) {
    if (inside(publicRoot,stateDir)) throw new Error("private stateDir overlaps public output");
    for (const lane of evidence) if (inside(publicRoot,lane.outputDir)) { lane.legacyOutputDir=lane.outputDir; lane.outputDir=path.join(stateDir,"evidence",lane.id); }
    if (inventory && inside(publicRoot,inventory.output)) { inventory.legacyOutput=inventory.output; inventory.output=path.join(stateDir,"artifacts",`${inventory.id}.json`); }
  }
  for (const lane of evidence) {
    if (!Array.isArray(lane.command) || !lane.command.length || !["source read", "mocked", "integration", "canary", "deployment", "manual"].includes(lane.proof)) throw new Error(`${lane.id}: evidence requires command array and proof boundary`);
    if (!(lane.inputs?.length > 1)) throw new Error(`${lane.id}: declare production inputs for evidence`);
    if (!inside(root, lane.cwd)) throw new Error(`${lane.id}: cwd outside project`);
    if (lane.command.some(value=>typeof value!=="string" || !value)) throw new Error(`${lane.id}: command must contain nonempty strings`);
    if (lane.maxLogBytes!==undefined && (!Number.isSafeInteger(lane.maxLogBytes) || lane.maxLogBytes<1 || lane.maxLogBytes>16777216)) throw new Error(`${lane.id}: invalid maxLogBytes`);
    if (lane.timeoutMs !== undefined && (!Number.isFinite(lane.timeoutMs) || lane.timeoutMs <= 0)) throw new Error(`${lane.id}: invalid timeoutMs`);
    for (const output of [...(lane.outputs ?? []), ...(lane.resultFile ? [lane.resultFile] : [])]) safePath(lane.outputDir, output);
  }
  for (const group of screenshots) {
    if (!group.id || !group.inputs?.length) throw new Error("screenshots require id and production inputs");
    for (const input of group.inputs) safePath(root, input);
    if (!inside(root, group.manifest) || !inside(root, group.assets)) throw new Error(`${group.id}: screenshot paths outside root`);
  }
  validateProducerSettings(result);
  selectArtifacts(result);
  return result;
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
  if (artifact.databases) { if (!artifact.inputs?.length)  return []; }
  return [];
}
