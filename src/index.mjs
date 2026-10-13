import {selectArtifacts} from "./plan.mjs";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { buildCollection } from "./site.mjs";
import { buildOpenApi, validateOpenApi } from "./openapi.mjs";
import { buildDiagrams } from "./diagrams.mjs";
import { buildInventory } from "./inventory.mjs";
import { buildDatabaseDocs } from "./database.mjs";
import { assertDeterministic, validateSite } from "./check.mjs";
import { initializeProject } from "./init.mjs";
import { createProvenance, verifyProvenance, provenancePath, inputDigest } from "./provenance.mjs";
import { readCampaign, buildCampaign, evidenceOutput } from "./campaign.mjs";
import { validateScreenshots } from "./screenshots.mjs";
import { buildLanding } from "./delivery.mjs";
import { exists } from "./files.mjs";
import { runEvidence, verifyEvidence } from "./evidence.mjs";

import { loadPresentation } from "./presentation.mjs";
export { initializeProject };
export { adoptProject } from "./adopt.mjs";

const selected=selectArtifacts;
async function context(config, render = true) {
  const campaign = config.campaign ? await readCampaign(config.campaign) : undefined;
  const publishedFiles = new Map(config.openapi.map(a => [a.source, path.join(a.outputDir, "index.html")]));
  return { inventory: config.inventory, presentation: render ? await loadPresentation(config.presentation) : undefined, root: config.root, collections: config.collections, campaign, publishedFiles };
}
async function renderArtifact(config, artifact, ctx, original = artifact) {
  if (config.collections.includes(original)) await buildCollection(artifact, ctx);
  else if (config.diagrams.includes(original)) await buildDiagrams(artifact);
  else if (config.openapi.includes(original)) await buildOpenApi(artifact);
  else if (original === config.inventory) await buildInventory(artifact);
  else if (original === config.databaseDocs) await buildDatabaseDocs(artifact, config.root);
  else if (original === config.campaign) await buildCampaign(artifact, ctx.campaign, config.root, ctx.presentation);
  else if (original === config.landing) await buildLanding(artifact, config.collections, ctx.presentation);
  else throw new Error(`unknown artifact ${artifact.id}`);

}
async function buildArtifact(config, artifact, ctx) {
 const before=await inputDigest(config.root,artifact.inputs,{exclude:artifact.inputExclude});
 const {publish,publishOwnedFiles}=await import('./transactions.mjs');
 const options={lockTarget:path.join(config.stateDir,"publication"), allowedTargets:[config.stateDir,...config.artifacts.map(a=>a.outputDir??a.output)],metadataFile:provenancePath(artifact), metadata:stage=>createProvenance(config,{...artifact,...(artifact.outputDir?{outputDir:stage}:{output:stage})},before),afterInstall:async()=>{if(before!==await inputDigest(config.root,artifact.inputs,{exclude:artifact.inputExclude}))throw new Error(`${artifact.id}: inputs changed while publishing`);}};
 const render=stage=>renderArtifact(config,{...artifact,renderOutputDir:artifact.outputDir,...(artifact.outputDir?{outputDir:stage}:{output:stage})},ctx,artifact);
 const writer=async stage=>{ await render(stage); if(artifact.outputDir) { const {registerPublication,publishedFiles,publicationManifest}=await import('./publication.mjs'); await registerPublication(stage); if(artifact.portal) {const {writeFile}=await import('node:fs/promises');const files=await publishedFiles(stage);for(const child of config.artifacts.filter(a=>a!==artifact && a.outputDir && a.outputDir.startsWith(artifact.outputDir+path.sep))) {if(await exists(path.join(child.outputDir,publicationManifest))) for(const file of await publishedFiles(child.outputDir)) files.add(path.relative(artifact.outputDir,path.join(child.outputDir,file)).split(path.sep).join('/'));}await writeFile(path.join(stage,publicationManifest),JSON.stringify({formatVersion:1,files:[...files].sort()})+'\n');} } };
 if(artifact.portal) await publishOwnedFiles(artifact.outputDir,['index.html','site.js','_presentation','.reviewdocs-publication.json'],writer,options);
 else await publish(artifact.outputDir??artifact.output,writer,{...options,file:!artifact.outputDir});
}
export async function buildAll(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath,{only});
  const ctx = await context(config);
  for (const artifact of selected(config, only)) await buildArtifact(config, artifact, ctx);
}
export async function checkAll(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath,{only});
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
  const config = await loadConfig(configPath,{only});
  selected(config, only);
  await context(config, false);
  for (const artifact of selected(config, only)) await verifyProvenance(config, artifact);
  for (const lane of config.evidence.filter(l => only.length ? only.includes(l.id) : l.required)) await verifyEvidence(config, lane);
  for (const group of config.screenshots) await validateScreenshots(group, config.root);
  console.log("verified source fingerprints and retained outputs without rebuilding");
}
export async function executeEvidence(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath,{only});
  if (!only.length) throw new Error("evidence execution requires --only <lane-id,...>");
  for (const id of only) if (!config.evidence.some(l => l.id === id)) throw new Error(`unknown evidence lane: ${id}`);
  const results = [];
  for (const lane of config.evidence.filter(l => only.includes(l.id))) results.push(await runEvidence(config, lane));
  return results;
}

export {doctor} from "./doctor.mjs";
export {migrateProject} from "./migrate.mjs";
