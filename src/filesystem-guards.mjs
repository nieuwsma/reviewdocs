import path from "node:path";
import {lstat} from "node:fs/promises";
export async function assertNoSymlink(root, target) {
  let current = root;
  for (const segment of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let metadata;
    try { metadata = await lstat(current); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (metadata.isSymbolicLink()) throw new Error(`refusing output through symlink: ${current}`);
  }
}

