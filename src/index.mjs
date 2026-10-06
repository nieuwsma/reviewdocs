import path from "node:path";
import { artifactSelected, loadConfig } from "./config.mjs";
import { buildCollection } from "./site.mjs";
import { buildOpenApi, validateOpenApi } from "./openapi.mjs";
import { buildDiagrams } from "./diagrams.mjs";
import { buildInventory } from "./inventory.mjs";
import { buildDatabaseDocs } from "./database.mjs";
import { assertDeterministic, validateSite } from "./check.mjs";
import { initializeProject } from "./init.mjs";
import { recordProvenance, verifyProvenance, provenancePath, inputDigest } from "./provenance.mjs";
import { readCampaign, buildCampaign, evidenceOutput } from "./campaign.mjs";
import { validateScreenshots } from "./screenshots.mjs";
import { buildLanding } from "./delivery.mjs";
import { exists } from "./files.mjs";
import { runEvidence, verifyEvidence } from "./evidence.mjs";

import { loadPresentation } from "./presentation.mjs";
export { initializeProject };
export { adoptProject } from "./adopt.mjs";

function selected(config, only) {
  const known = [...config.artifacts, ...config.evidence].map(a => a.id);
  for (const id of only) if (!known.includes(id)) throw new Error(`unknown artifact id: ${id}`);
  const ordered = [], visited = new Set();
  function visit(artifact) {
    if (visited.has(artifact.id)) return;
    visited.add(artifact.id);
    for (const id of artifact.dependsOn ?? []) visit(config.artifacts.find(a=>a.id===id));
    ordered.push(artifact);
  }
  for (const artifact of config.artifacts.filter(a=>artifactSelected(a.id,only))) visit(artifact);
  return ordered;
}
async function context(config, render = true) {
  const campaign = config.campaign ? await readCampaign(config.campaign) : undefined;
  const publishedFiles = new Map(config.openapi.map(a => [a.source, path.join(a.outputDir, "openapi.json")]));
  for (const evidence of campaign?.evidence.filter(e => e.path) ?? []) publishedFiles.set(path.resolve(config.root, evidence.path), path.join(config.campaign.outputDir, evidenceOutput(evidence)));
  return { inventory: config.inventory, presentation: render ? await loadPresentation(config.presentation) : undefined, root: config.root, collections: config.collections, campaign, publishedFiles };
}
async function buildArtifact(config, artifact, ctx) {
  const before = await inputDigest(config.root, artifact.inputs, { exclude: artifact.inputExclude });
  if (config.collections.includes(artifact)) await buildCollection(artifact, ctx);
  else if (config.diagrams.includes(artifact)) await buildDiagrams(artifact);
  else if (config.openapi.includes(artifact)) await buildOpenApi(artifact);
  else if (artifact === config.inventory) await buildInventory(artifact);
  else if (artifact === config.databaseDocs) await buildDatabaseDocs(artifact, config.root);
  else if (artifact === config.campaign) await buildCampaign(artifact, ctx.campaign, config.root, ctx.presentation);
  else if (artifact === config.landing) await buildLanding(artifact, config.collections, ctx.presentation);
  else throw new Error(`unknown artifact ${artifact.id}`);
  await recordProvenance(config, artifact, before);
}
export async function buildAll(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath);
  const ctx = await context(config);
  for (const artifact of selected(config, only)) await buildArtifact(config, artifact, ctx);
}
export async function checkAll(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath);
  const ctx = await context(config);
  const artifacts = selected(config, only);
  for (const artifact of artifacts) await buildArtifact(config, artifact, ctx);
  for (const artifact of artifacts) {
    if (config.collections.includes(artifact) || config.openapi.includes(artifact) || artifact === config.campaign) await assertDeterministic(artifact.outputDir, () => buildArtifact(config, artifact, ctx));
    if (config.openapi.includes(artifact)) await validateOpenApi(artifact);
    await verifyProvenance(config, artifact, { allowUnqualified: !config.provenance?.required });
  }
  const directories = [];
  for (const artifact of config.artifacts) if (artifact.outputDir && await exists(artifact.outputDir)) directories.push(artifact.outputDir);
  for (const collection of config.collections.filter(c => artifacts.includes(c))) {
    const count = await validateSite(collection.outputDir, { directories, portable: collection.portable, root: collection.portable ? (config.landing?.outputDir ?? config.root) : undefined });
    console.log(`checked ${collection.id}: deterministic, ${count} linked HTML pages`);
  }
  for (const group of config.screenshots) console.log(`checked ${group.id}: ${await validateScreenshots(group, config.root)} screenshots`);
  for (const lane of config.evidence.filter(l => l.required)) await verifyEvidence(config, lane);
  if (config.provenance?.required) {
    for (const artifact of config.artifacts.filter(a => !artifacts.includes(a))) {
      if (await exists(provenancePath(artifact))) await verifyProvenance(config, artifact);
      else throw new Error(`${artifact.id}: missing provenance; regenerate this artifact explicitly`);
    }
  }
}
export async function verifyAll(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath);
  selected(config, only);
  await context(config, false);
  for (const artifact of selected(config, only)) await verifyProvenance(config, artifact);
  for (const lane of config.evidence.filter(l => only.length ? only.includes(l.id) : l.required)) await verifyEvidence(config, lane);
  for (const group of config.screenshots) await validateScreenshots(group, config.root);
  console.log("verified source fingerprints and retained outputs without rebuilding");
}
export async function executeEvidence(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath);
  if (!only.length) throw new Error("evidence execution requires --only <lane-id,...>");
  for (const id of only) if (!config.evidence.some(l => l.id === id)) throw new Error(`unknown evidence lane: ${id}`);
  const results = [];
  for (const lane of config.evidence.filter(l => only.includes(l.id))) results.push(await runEvidence(config, lane));
  return results;
}
