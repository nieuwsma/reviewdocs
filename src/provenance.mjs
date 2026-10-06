import { createHash } from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { exists } from "./files.mjs";
import { inside, slash } from "./paths.mjs";

export const hash = value => createHash("sha256").update(value).digest("hex");
export const version = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version;
const excludedSegments = new Set([".git", "node_modules", ".venv", "vendor", "dist", "build", "coverage", ".local"]);
export async function inputDigest(root, inputs, { exclude = [] } = {}) {
  const records = new Map();
  async function visit(filename) {
    const rel = slash(path.relative(root, filename));
    if (!inside(root, filename)) throw new Error(`input outside project: ${filename}`);
    if (exclude.some(prefix => rel === prefix.replace(/\/$/, "") || rel.startsWith(`${prefix.replace(/\/$/, "")}/`))) return;
    const metadata = await import("node:fs/promises").then(fs => fs.lstat(filename));
    if (metadata.isSymbolicLink()) throw new Error(`input symlink requires explicit materialization: ${rel}`);
    if (metadata.isDirectory()) {
      for (const entry of (await readdir(filename)).sort()) {
        if (excludedSegments.has(entry)) continue;
        await visit(path.join(filename, entry));
      }
    } else if (metadata.isFile()) records.set(rel, hash(await readFile(filename)));
  }
  for (const input of inputs) await visit(path.resolve(root, input));
  return hash(JSON.stringify([...records].sort(([a], [b]) => a.localeCompare(b))));
}
export function sourceState(root) {
  try {
    return { commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(), dirty: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim()) };
  } catch { return { commit: null, dirty: null }; }
}
export const provenancePath = artifact => artifact.outputDir ? path.join(artifact.outputDir, ".reviewdocs-provenance.json") : `${artifact.output}.provenance.json`;
export async function outputDigest(artifact) {
  if (artifact.portal) {
    if (!artifact.presentationAssets) return hash(await readFile(path.join(artifact.outputDir, "index.html")));
    return hash(JSON.stringify([hash(await readFile(path.join(artifact.outputDir, "index.html"))), hash(await readFile(path.join(artifact.outputDir, "site.js"))), await inputDigest(artifact.outputDir, [artifact.presentationAssets])]));
  }
  if (!artifact.outputDir) return hash(await readFile(artifact.output));
  const files = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (filename === provenancePath(artifact)) continue;
      if (entry.isSymbolicLink()) throw new Error(`output contains symlink: ${filename}`);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile()) files.push([slash(path.relative(artifact.outputDir, filename)), hash(await readFile(filename))]);
    }
  }
  await visit(artifact.outputDir);
  return hash(JSON.stringify(files.sort(([a], [b]) => a.localeCompare(b))));
}
export async function recordProvenance(config, artifact, expectedInputHash) {
  const inputHash = await inputDigest(config.root, artifact.inputs, { exclude: artifact.inputExclude });
  if (expectedInputHash && expectedInputHash !== inputHash) throw new Error(`${artifact.id}: inputs changed while building; no current provenance recorded`);
  const dependencies = [];
  for (const id of artifact.dependsOn??[]) {
    const dependency=config.artifacts.find(a=>a.id===id);
    await verifyProvenance(config,dependency);
    const proof=JSON.parse(await readFile(provenancePath(dependency),'utf8'));
    dependencies.push({artifact:id,inputHash:proof.inputHash,outputHash:proof.outputHash});
  }
  const manifest = { dependencies, formatVersion: 1, artifact: artifact.id, toolkitVersion: version, source: sourceState(config.root), inputs: artifact.inputs, qualifiedInputs: !artifact.databases || artifact.inputs.length > 1, inputHash, outputHash: await outputDigest(artifact), status: "built" };
  await writeFile(provenancePath(artifact), `${JSON.stringify(manifest, null, 2)}\n`);
}
export async function verifyProvenance(config, artifact, { allowUnqualified = false } = {}) {
  if (!await exists(provenancePath(artifact))) throw new Error(`${artifact.id}: missing provenance; build this artifact explicitly`);
  const manifest = JSON.parse(await readFile(provenancePath(artifact), "utf8"));
  if (manifest.qualifiedInputs === false && !allowUnqualified) throw new Error(`${artifact.id}: declare migration and producer inputs before claiming freshness`);
  if (manifest.toolkitVersion !== version || manifest.inputHash !== await inputDigest(config.root, artifact.inputs, { exclude: artifact.inputExclude })) throw new Error(`${artifact.id}: stale inputs; regenerate evidence explicitly`);
  for (const id of artifact.dependsOn??[]) {
    const dependency=config.artifacts.find(a=>a.id===id);
    await verifyProvenance(config,dependency,{allowUnqualified});
    const proof=JSON.parse(await readFile(provenancePath(dependency),'utf8'));
    const recorded=manifest.dependencies?.find(d=>d.artifact===id);
    if (!recorded || recorded.inputHash!==proof.inputHash || recorded.outputHash!==proof.outputHash) throw new Error(`${artifact.id}: stale dependency ${id}; regenerate this artifact`);
  }
  if (manifest.outputHash !== await outputDigest(artifact)) throw new Error(`${artifact.id}: generated output was changed or is incomplete`);
}
