import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { digestDirectory, filesBelow } from "./files.mjs";

function attributeValues(html, attribute) {
  return [...html.matchAll(new RegExp(`\\b${attribute}=(?:"([^"]+)"|'([^']+)')`, "g"))].map(match => (match[1] ?? match[2]).replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'"));
}

function documentIds(html) {
  return new Set(attributeValues(html, "id").map(decodeURIComponent));
}

export async function validateSite(directory, { directories = [directory], portable = false, root = undefined } = {}) {
  const htmlFiles = [...new Set((await Promise.all(directories.map(filesBelow))).flat().filter(filename => filename.endsWith(".html")))];
  const documents = new Map();
  for (const filename of htmlFiles) {
    const html = await readFile(filename, "utf8");
    const ids = attributeValues(html, "id");
    if (ids.length !== new Set(ids).size) throw new Error(`${filename}: duplicate heading/element ids`);
    documents.set(filename, { html, ids: documentIds(html) });
  }
  const failures = [];
  for (const [filename, document] of documents) {
    for (const rawTarget of [...attributeValues(document.html, "href"), ...attributeValues(document.html, "src")]) {
      if (portable && /^file:/i.test(rawTarget)) { failures.push(`${path.relative(directory, filename)}: nonportable ${rawTarget}`); continue; }
      if (/^(?:[a-z]+:|\/\/)/i.test(rawTarget)) continue;
      const [rawPath, rawFragment = ""] = rawTarget.split("#", 2);
      const cleanPath = rawPath.split("?", 1)[0];
      const target = cleanPath ? path.resolve(path.dirname(filename), decodeURIComponent(cleanPath)) : filename;
      if (root && !((await import("./paths.mjs")).inside(root, target))) { failures.push(`${filename}: link outside portable site ${rawTarget}`); continue; }
      try { await stat(target); } catch { failures.push(`${path.relative(directory, filename)}: missing ${rawTarget}`); continue; }
      if (rawFragment && target.endsWith(".html")) {
        if (!documents.has(target)) {
          const html = await readFile(target, "utf8");
          documents.set(target, { html, ids: documentIds(html) });
        }
        if (!documents.get(target).ids.has(decodeURIComponent(rawFragment))) failures.push(`${path.relative(directory, filename)}: missing fragment ${rawTarget}`);
      }
    }
  }
  if (failures.length) throw new Error(`link validation failed:\n${failures.join("\n")}`);
  return htmlFiles.length;
}

export async function assertDeterministic(directory, rebuild) {
  const before = await digestDirectory(directory);
  await rebuild();
  const after = await digestDirectory(directory);
  if (before !== after) throw new Error(`output is not deterministic: ${before} != ${after}`);
}
