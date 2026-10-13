import { publish } from "./transactions.mjs";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export async function filesBelow(directory, { skip = () => false } = {}) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (skip(candidate, entry)) continue;
    if (entry.isDirectory()) result.push(...await filesBelow(candidate, { skip }));
    if (entry.isFile()) result.push(candidate);
  }
  return result.sort();
}

export async function digestDirectory(directory) {
  const hash = createHash("sha256");
  for (const filename of await filesBelow(directory)) {
    hash.update(path.relative(directory, filename));
    hash.update("\0");
    hash.update(await readFile(filename));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function replaceDirectory(finalDirectory, writer, options = {}) {
  return publish(finalDirectory, writer, options);
}

export async function writeText(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, value.endsWith("\n") ? value : `${value}\n`);
}

export async function exists(filename) {
  try { await stat(filename); return true; } catch { return false; }
}
