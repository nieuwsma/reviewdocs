import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { escapeHtml as esc } from "./paths.mjs";
import { filesBelow } from "./files.mjs";

const defaultExcluded = [".git/", "node_modules/", "vendor/", "dist/", "build/", "coverage/", "docs/generated/"];

export async function buildInventory(configuration) {
  const excluded = configuration.exclude ?? defaultExcluded;
  const includedExtensions = new Set(configuration.extensions ?? [".go", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".rs", ".java", ".kt", ".sh", ".sql", ".css", ".html"]);
  const records = [];
  const isExcluded = filename => {
    const relative = path.relative(configuration.root, filename).split(path.sep).join("/");
    const segments = relative.split("/");
    return (!configuration.includeGenerated && segments.some(segment => [".git", "node_modules", ".venv", "vendor", "dist", "build", "coverage", ".local"].includes(segment))) || excluded.some(prefix => relative === prefix.replace(/\/$/, "") || relative.startsWith(`${prefix.replace(/\/$/, "")}/`));
  };
  for (const filename of await filesBelow(configuration.root, { skip: isExcluded })) {
    const relative = path.relative(configuration.root, filename).split(path.sep).join("/");
    if (configuration.include && !configuration.include.some(prefix => prefix === "." || relative === prefix.replace(/\/$/, "") || relative.startsWith(`${prefix.replace(/\/$/, "")}/`))) continue;
    if (!includedExtensions.has(path.extname(filename))) continue;
    const text = await readFile(filename, "utf8");
    const lines = text.length ? text.replace(/\r?\n$/, "").split(/\r?\n/) : [];
    records.push({ path: relative, language: path.extname(filename).slice(1), lines: lines.length, nonblank: lines.filter(line => line.trim()).length, test: /(?:^|\/)(?:test|tests|__tests__|e2e)(?:\/|$)|(?:_test|\.test|\.spec)\.|(?:^|\/)test[-_]/.test(relative) });
  }
  const sum = files => ({ files: files.length, lines: files.reduce((n,f)=>n+f.lines,0), nonblank: files.reduce((n,f)=>n+f.nonblank,0), testNonblank: files.filter(f=>f.test).reduce((n,f)=>n+f.nonblank,0) });
  const surfaces = configuration.surfaces ?? [...new Set(records.map(f=>f.path.split('/')[0]))].sort().map(id=>({id,label:id,include:[id]}));
  const result = {
    formatVersion: 2,
    scope: { include: configuration.include ?? ["."], exclude: excluded, nestedGeneratedExcluded: !configuration.includeGenerated },
    method: "Physical lines and nonblank physical lines; comments count, blank lines do not count toward nonblank totals. A final newline does not add a line. This is source size, not executable-statement count or review coverage.",
    totals: sum(records),
    categories: { productionAndTooling: sum(records.filter(f=>!f.test)), tests: sum(records.filter(f=>f.test)) },
    surfaces: Object.fromEntries(surfaces.map(surface=>[surface.id,{label:surface.label??surface.id,...sum(records.filter(f=>!f.test&&(surface.include??[surface.id]).some(prefix=>f.path===prefix||f.path.startsWith(prefix.replace(/\/$/,"")+"/"))))}])),
    files: records,
    languages: Object.fromEntries([...new Set(records.map(r => r.language))].sort().map(language => [language, sum(records.filter(r=>r.language===language))])),
    directories: Object.fromEntries([...new Set(records.map(r => path.posix.dirname(r.path)))].sort().map(directory => {
      const files = records.filter(r => path.posix.dirname(r.path) === directory);
      return [directory, { files: files.length, nonblank: files.reduce((n, r) => n + r.nonblank, 0), testNonblank: files.filter(r => r.test).reduce((n, r) => n + r.nonblank, 0) }];
    })),
  };
  await mkdir(path.dirname(configuration.output), { recursive: true });
  await writeFile(configuration.output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`built ${configuration.id ?? "inventory"}: ${records.length} files`);
}


export function renderInventory(inventory) {
  if (inventory.formatVersion !== 2) throw new Error('inventory report needs current inventory format; rebuild inventory');
  const number = n => n.toLocaleString('en-US');
  const table = (head, rows) => `<table><thead><tr>${head.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const languages={go:'Go',js:'JavaScript',mjs:'Node .mjs',cjs:'Node .cjs',ts:'TypeScript',tsx:'TSX',jsx:'JSX',py:'Python',sh:'Shell',sql:'SQL',css:'CSS',html:'HTML',json:'JSON',yaml:'YAML',yml:'YAML',md:'Markdown',rs:'Rust',java:'Java',kt:'Kotlin'};
  return `<h2 id="source-line-counts">First-party line counts</h2><p><strong>${number(inventory.totals.nonblank)}</strong> nonblank lines across <strong>${number(inventory.totals.files)}</strong> files; <strong>${number(inventory.totals.lines)}</strong> physical lines including blanks.</p>`+
    table(['Category','Files','Nonblank','Physical'],Object.entries(inventory.categories).map(([key,v])=>[key==='tests'?'Tests':'Production and tooling',number(v.files),number(v.nonblank),number(v.lines)]))+
    `<h3>By file type</h3>`+table(['Language / type','Files','Nonblank','Physical','Production / tooling nonblank','Test nonblank'],Object.entries(inventory.languages).map(([ext,v])=>[`${languages[ext]??ext} (.${ext})`,number(v.files),number(v.nonblank),number(v.lines),number(v.nonblank-v.testNonblank),number(v.testNonblank)]))+
    `<h3>Production and tooling by surface</h3>`+table(['Surface','Files','Nonblank','Physical'],Object.values(inventory.surfaces).map(v=>[v.label,number(v.files),number(v.nonblank),number(v.lines)]))+
    `<h3>Measurement boundary</h3><p>${esc(inventory.method)}</p><p>Included roots: ${inventory.scope.include.map(esc).join(', ')}. Excluded paths: ${inventory.scope.exclude.map(esc).join(', ')}. ${inventory.scope.nestedGeneratedExcluded?'Nested dependencies, vendor trees, virtual environments and build outputs are also excluded.':''}</p>`;
}
