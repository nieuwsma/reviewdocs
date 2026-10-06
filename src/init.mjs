import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exists, filesBelow } from "./files.mjs";
import { adoptProject } from "./adopt.mjs";
import { assertNoSymlink } from "./config.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function initializeProject(destination, { force = false } = {}) {
  await mkdir(destination, { recursive: true });
  const template = path.join(packageRoot, "templates", "project");
  for (const source of await filesBelow(template)) {
    const relative = path.relative(template, source);
    const target = path.join(destination, relative);
    await assertNoSymlink(destination, target);
    if (await exists(target) && !force) throw new Error(`${target} already exists; use --force to replace starter-file conflicts`);
  }
  await cp(template, destination, { recursive: true, force });
  await adoptProject(destination);
  console.log(`initialized reviewdocs project in ${destination}`);
}
