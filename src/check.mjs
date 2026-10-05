import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { digestDirectory, filesBelow } from "./files.mjs";

function attributeValues(html, attribute) {
  return [...html.matchAll(new RegExp(`\\b${attribute}="([^"]+)"`, "g"))].map(match => match[1]);
}

function documentIds(html) {
  return new Set(attributeValues(html, "id").map(decodeURIComponent));
}

export async function validateSite(directory) {
  const htmlFiles = (await filesBelow(directory)).filter(filename => filename.endsWith(".html"));
  const documents = new Map();
  for (const filename of htmlFiles) {
    const html = await readFile(filename, "utf8");
    documents.set(filename, { html, ids: documentIds(html) });
  }
  const failures = [];
  for (const [filename, document] of documents) {
    for (const rawTarget of [...attributeValues(document.html, "href"), ...attributeValues(document.html, "src")]) {
      if (/^(?:[a-z]+:|\/\/)/i.test(rawTarget)) continue;
      const [rawPath, rawFragment = ""] = rawTarget.split("#", 2);
      const cleanPath = rawPath.split("?", 1)[0];
      const target = cleanPath ? path.resolve(path.dirname(filename), decodeURIComponent(cleanPath)) : filename;
      try { await stat(target); } catch { failures.push(`${path.relative(directory, filename)}: missing ${rawTarget}`); continue; }
      if (rawFragment && documents.has(target) && !documents.get(target).ids.has(decodeURIComponent(rawFragment))) failures.push(`${path.relative(directory, filename)}: missing fragment ${rawTarget}`);
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
