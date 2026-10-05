import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { replaceDirectory } from "./files.mjs";

const require = createRequire(import.meta.url);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
    child.on("error", reject);
  });
}

export async function buildDiagrams(group) {
  let renderer;
  try { renderer = path.join(path.dirname(require.resolve("@mermaid-js/mermaid-cli/package.json")), "src", "cli.js"); }
  catch { throw new Error("Mermaid rendering requires optional dependency @mermaid-js/mermaid-cli"); }
  const sources = (await readdir(group.sourceDir)).filter(name => name.endsWith(".mmd")).sort();
  await replaceDirectory(group.outputDir, async staging => {
    for (const source of sources) await run(process.execPath, [renderer, "-i", path.join(group.sourceDir, source), "-o", path.join(staging, source.replace(/\.mmd$/, ".svg")), "-b", "transparent"]);
  });
  console.log(`built ${group.id}: ${sources.length} diagrams`);
}
