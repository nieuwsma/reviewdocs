import { mkdir, readFile, writeFile, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filesBelow, exists } from "./files.mjs";
import { safePath, slash } from "./paths.mjs";
import { hash, version } from "./provenance.mjs";

const defaultTemplate = fileURLToPath(new URL("../templates/project/", import.meta.url));
async function noSymlinks(root, target) {
  let current = root;
  if ((await lstat(root)).isSymbolicLink()) throw new Error("adoption root cannot be a symlink");
  for (const segment of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (await exists(current) && (await lstat(current)).isSymbolicLink()) throw new Error(`refusing to write through symlink: ${current}`);
  }
}
export async function adoptProject(destination, { dryRun = false, skills = true, profile = "complete", template = defaultTemplate } = {}) {
  if (profile !== "complete") throw new Error("supported profile: complete (customize collections after adoption)");
  if (!await exists(destination)) {
    if (dryRun) throw new Error("dry-run destination must already exist");
    await mkdir(destination, { recursive: true });
  }
  const manifestPath = safePath(destination, ".reviewdocs/install.json");
  await noSymlinks(destination, manifestPath);
  const previous = await exists(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : { files: {} };
  const manifest = { formatVersion: 1, toolkitVersion: version, files: { ...previous.files } };
  const operations = [];
  for (const source of await filesBelow(template)) {
    const relative = slash(path.relative(template, source));
    if (!skills && relative.startsWith(".agents/")) continue;
    // CI is always a recipe to review, never a new workflow in an established repo.
    const targetName = relative.startsWith(".github/") ? `.reviewdocs/recipes/${relative}` : relative;
    const target = safePath(destination, targetName);
    await noSymlinks(destination, target);
    const incoming = await readFile(source, "utf8");
    const local = await exists(target) ? await readFile(target, "utf8") : undefined;
    const base = previous.files[targetName];
    const managed = relative.startsWith(".agents/") || targetName.startsWith(".reviewdocs/recipes/");
    const action = local === undefined ? "create" : local === incoming ? "unchanged" : managed && base?.hash === hash(local) ? "upgrade" : "conflict";
    operations.push({ path: targetName, action });
    if (dryRun) continue;
    if (action === "conflict") {
      const proposal = safePath(destination, `.reviewdocs/proposals/${targetName}.json`);
      await noSymlinks(destination, proposal);
      await mkdir(path.dirname(proposal), { recursive: true });
      await writeFile(proposal, `${JSON.stringify({ path: targetName, base: base?.content ?? null, local, incoming }, null, 2)}\n`);
      continue;
    }
    if (action !== "unchanged") {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, incoming);
    }
    if (managed) manifest.files[targetName] = { hash: hash(incoming), content: incoming };
  }
  if (!dryRun) {
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  for (const operation of operations) console.log(`${dryRun ? "would " : ""}${operation.action}: ${operation.path}`);
  return operations;
}
