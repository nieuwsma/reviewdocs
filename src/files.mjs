import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export async function filesBelow(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(candidate));
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

export async function replaceDirectory(finalDirectory, writer) {
  const staging = `${finalDirectory}.staging`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  try {
    await writer(staging);
    await rm(finalDirectory, { recursive: true, force: true });
    await rename(staging, finalDirectory);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function writeText(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, value.endsWith("\n") ? value : `${value}\n`);
}

export async function exists(filename) {
  try { await stat(filename); return true; } catch { return false; }
}
