import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { replaceDirectory } from "./files.mjs";

marked.use(gfmHeadingId({ prefix: "" }));
marked.setOptions({ gfm: true, breaks: false });

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const outputName = page => page.output ?? page.file.replace(/\.md$/i, ".html");

function rewriteLinks(html, page, pages, sourceDir, outputDir, assets = [], rewrites = {}) {
  const sourceMap = new Map(pages.map(candidate => [path.resolve(sourceDir, candidate.file), outputName(candidate)]));
  return html.replace(/\b(href|src)="([^"]+)"/g, (_, attribute, target) => {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) return `${attribute}="${escape(target)}"`;
    if (rewrites[target]) return `${attribute}="${escape(rewrites[target])}"`;
    const [pathWithQuery, fragment = ""] = target.split("#", 2);
    const [pathname, query = ""] = pathWithQuery.split("?", 2);
    if (!pathname) return `${attribute}="${escape(target)}"`;
    const absolute = path.resolve(sourceDir, path.dirname(page.file), pathname);
    const assetMatch = assets.some(asset => absolute === path.resolve(sourceDir, asset) || absolute.startsWith(`${path.resolve(sourceDir, asset)}${path.sep}`));
    const rewritten = sourceMap.get(absolute) ?? (assetMatch ? path.relative(sourceDir, absolute).split(path.sep).join("/") : path.relative(outputDir, absolute).split(path.sep).join("/"));
    const suffix = `${query ? `?${query}` : ""}${fragment ? `#${fragment}` : ""}`;
    return `${attribute}="${escape(rewritten + suffix)}"`;
  });
}

function style() {
  return `:root{color-scheme:light dark;--bg:#f3f5f7;--paper:#fff;--ink:#20262d;--muted:#5c6773;--line:#d8dee5;--brand:#285f9d}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,sans-serif}.skip{position:absolute;left:-9999px}.skip:focus{left:1rem;top:1rem;background:var(--paper);padding:.7rem}.masthead{position:sticky;top:0;z-index:2;background:#17283a;color:#fff;padding:1rem 2rem;display:flex;justify-content:space-between}.layout{max-width:1300px;margin:auto;display:grid;grid-template-columns:260px minmax(0,960px);gap:2rem;padding:2rem}.sidebar{position:sticky;top:5.5rem;align-self:start;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:1rem}.sidebar a{display:block;padding:.35rem .5rem;color:var(--brand)}.sidebar a[aria-current]{background:#e9f1fa;font-weight:700}.artifact-links{border-top:1px solid var(--line);margin-top:1rem;padding-top:1rem}.artifact-links strong{display:block}.content{min-width:0;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:2rem}.content h1{margin-top:0}.content h2{border-bottom:1px solid var(--line);margin-top:2.2rem}.content img{max-width:100%}.content table{display:block;overflow:auto;border-collapse:collapse}.content td,.content th{border:1px solid var(--line);padding:.55rem;text-align:left}.content pre{overflow:auto;padding:1rem;background:#eef2f5}.content code{overflow-wrap:anywhere}@media(max-width:780px){.layout{display:block;padding:1rem}.sidebar{position:static;margin-bottom:1rem}.content{padding:1rem}}@media(prefers-color-scheme:dark){:root{--bg:#111820;--paper:#1b252f;--ink:#edf2f7;--muted:#b3bec9;--line:#40505f;--brand:#8dc1f4}.sidebar a[aria-current]{background:#263b50}.content pre{background:#111820}}@media print{.masthead,.sidebar,.skip{display:none}.layout{display:block;padding:0}.content{border:0;padding:0}}`;
}

export async function buildCollection(collection) {
  if (!collection.id || !collection.title || !collection.sourceDir || !collection.outputDir) throw new Error("each collection requires id, title, sourceDir, and outputDir");
  const pages = collection.pages ?? [];
  if (pages.length === 0) throw new Error(`collection ${collection.id} has no pages`);
  await replaceDirectory(collection.outputDir, async staging => {
    for (const page of pages) {
      const markdown = await readFile(path.join(collection.sourceDir, page.file), "utf8");
      const rendered = rewriteLinks(await marked.parse(markdown), page, pages, collection.sourceDir, staging, collection.assets ?? [], collection.rewrites ?? {});
      const navigation = pages.map(candidate => `<a href="${escape(outputName(candidate))}"${candidate.file === page.file ? ' aria-current="page"' : ""}>${escape(candidate.label ?? candidate.file)}</a>`).join("\n");
      const artifacts = (collection.artifacts ?? []).map(link => `<a href="${escape(link.href)}">${escape(link.label)}</a>`).join("\n");
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(page.label ?? page.file)} · ${escape(collection.title)}</title><link rel="stylesheet" href="site.css"></head><body><a class="skip" href="#content">Skip to content</a><header class="masthead"><strong>${escape(collection.title)}</strong><span>${escape(collection.subtitle ?? "")}</span></header><div class="layout"><nav class="sidebar" aria-label="Documentation">${navigation}${artifacts ? `<div class="artifact-links"><strong>Artifacts</strong>${artifacts}</div>` : ""}</nav><main id="content" class="content">${rendered}</main></div></body></html>\n`;
      await writeFile(path.join(staging, outputName(page)), html);
    }
    await writeFile(path.join(staging, "site.css"), `${style()}\n`);
    for (const asset of collection.assets ?? []) await cp(path.resolve(collection.sourceDir, asset), path.join(staging, asset), { recursive: true });
  });
  console.log(`built ${collection.id}: ${collection.outputDir}`);
}
