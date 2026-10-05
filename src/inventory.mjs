import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { filesBelow } from "./files.mjs";

const defaultExcluded = [".git/", "node_modules/", "vendor/", "dist/", "build/", "coverage/", "docs/generated/"];

export async function buildInventory(configuration) {
  const excluded = configuration.exclude ?? defaultExcluded;
  const includedExtensions = new Set(configuration.extensions ?? [".go", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".rs", ".java", ".kt", ".sh", ".sql", ".css", ".html"]);
  const records = [];
  for (const filename of await filesBelow(configuration.root)) {
    const relative = path.relative(configuration.root, filename).split(path.sep).join("/");
    if (excluded.some(prefix => relative === prefix.replace(/\/$/, "") || relative.startsWith(prefix))) continue;
    if (!includedExtensions.has(path.extname(filename))) continue;
    const text = await readFile(filename, "utf8");
    const lines = text.split(/\r?\n/);
    records.push({ path: relative, language: path.extname(filename).slice(1), lines: lines.length, nonblank: lines.filter(line => line.trim()).length, test: /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|(?:_test|\.test|\.spec)\./.test(relative) });
  }
  const result = {
    formatVersion: 1,
    method: "Physical nonblank lines. Generated outputs and dependencies are excluded by configured path prefixes.",
    totals: { files: records.length, nonblank: records.reduce((sum, record) => sum + record.nonblank, 0), testNonblank: records.filter(record => record.test).reduce((sum, record) => sum + record.nonblank, 0) },
    files: records,
  };
  await mkdir(path.dirname(configuration.output), { recursive: true });
  await writeFile(configuration.output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`built ${configuration.id ?? "inventory"}: ${records.length} files`);
}
