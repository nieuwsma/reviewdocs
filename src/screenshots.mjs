import { readFile, lstat, realpath } from "node:fs/promises";
import { marked } from "marked";
import path from "node:path";
import { filesBelow } from "./files.mjs";
import { safePath, slash, inside } from "./paths.mjs";
import { hash, inputDigest } from "./provenance.mjs";

export async function validateScreenshots(group, root) {
  const manifest = JSON.parse(await readFile(group.manifest, "utf8"));
  if (manifest.formatVersion !== 1 || !manifest.source?.inputHash || !manifest.mode || !(manifest.viewport?.width > 0 && manifest.viewport?.height > 0) || !Array.isArray(manifest.screenshots)) throw new Error(`${group.id}: invalid screenshot manifest`);
  if (manifest.source.inputHash !== await inputDigest(root, group.inputs ?? [])) throw new Error(`${group.id}: stale screenshot inputs; capture explicitly`);
  const declared = new Set();
  for (const image of manifest.screenshots) {
    if (!image.file || declared.has(image.file) || !image.alt || !image.chapter || !image.sha256) throw new Error(`${group.id}: incomplete/duplicate screenshot entry`);
    declared.add(image.file);
    const file = safePath(group.assets, image.file);
    if (!inside(await realpath(root), await realpath(file))) throw new Error(`${group.id}: screenshot escapes project`);
    if ((await lstat(file)).isSymbolicLink() || hash(await readFile(file)) !== image.sha256) throw new Error(`${group.id}: screenshot changed: ${image.file}`);
    const chapter = safePath(root, image.chapter);
    const text = await readFile(chapter, "utf8");
    const html = await marked.parse(text);
    const references = [...html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g)];
    if (!references.some(([, src, alt]) => path.resolve(path.dirname(chapter), decodeURIComponent(src.split(/[?#]/)[0])) === file && alt.trim())) throw new Error(`${group.id}: screenshot not illustrated with alt text in ${image.chapter}`);
  }
  for (const file of await filesBelow(group.assets)) if (/\.(png|jpe?g|webp)$/i.test(file) && !declared.has(slash(path.relative(group.assets, file)))) throw new Error(`${group.id}: unexplained screenshot ${file}`);
  return manifest.screenshots.length;
}
