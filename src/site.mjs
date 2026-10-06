import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { replaceDirectory } from "./files.mjs";
import { escapeHtml as escape, outputName, slash, inside } from "./paths.mjs";
import { stylesheet, javascript } from "./ui.mjs";
import { renderInventory } from "./inventory.mjs";
import { renderCampaign } from "./campaign.mjs";

import { copyPresentation } from "./presentation.mjs";

marked.use(gfmHeadingId({ prefix: "" }));
marked.setOptions({ gfm: true, breaks: false });

export function projectAudience(markdown, audience) {
  return markdown.replace(/^:::audience ([a-z, -]+)\n([\s\S]*?)^:::\s*$/gm, (_, audiences, content) => !audience || audiences.split(",").map(a => a.trim()).includes(audience) ? content : "");
}

function rewriteLinks(html, page, collection, collections, publishedFiles) {
  const sourceMap = new Map(publishedFiles);
  // Local projection wins when the same source is published more than once.
  for (const candidate of [...collections.filter(c => c !== collection), collection]) for (const p of candidate.pages) sourceMap.set(path.resolve(candidate.sourceDir, p.file), path.join(candidate.outputDir, outputName(p)));
  return html.replace(/\b(href|src)=(?:"([^"]+)"|'([^']+)')/g, (_, attribute, double, single) => {
    let target = (double ?? single).replaceAll("&amp;", "&");
    if (collection.portable && /^file:/i.test(target)) throw new Error(`${collection.id}: nonportable file link ${target}`);
    if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) {
      if (collection.bundled && !target.startsWith("#") && !(collection.allowedExternal ?? []).some(prefix => target.startsWith(prefix))) throw new Error(`${collection.id}: unbundled external link ${target}`);
      return `${attribute}="${escape(target)}"`;
    }
    if (collection.rewrites?.[target]) target = collection.rewrites[target];
    else {
      const [pathWithQuery, fragment = ""] = target.split("#", 2);
      const [pathname, query = ""] = pathWithQuery.split("?", 2);
      const absolute = path.resolve(collection.sourceDir, path.dirname(page.file), decodeURIComponent(pathname));
      const asset = (collection.assets ?? []).find(a => inside(path.resolve(collection.sourceDir, a), absolute));
      const mapped = sourceMap.get(absolute) ?? (asset ? path.join(collection.outputDir, path.relative(collection.sourceDir, absolute)) : absolute);
      target = slash(path.relative(path.dirname(path.join(collection.outputDir, outputName(page))), mapped)) + (query ? `?${query}` : "") + (fragment ? `#${fragment}` : "");
    }
    if (collection.bundled && !inside(collection.outputDir, path.resolve(path.dirname(path.join(collection.outputDir, outputName(page))), target.split(/[?#]/)[0]))) throw new Error(`${collection.id}: link leaves help bundle: ${target}; mark contributor content explicitly`);
    return `${attribute}="${escape(target)}"`;
  });
}

export async function buildCollection(collection, { collections = [collection], campaign, publishedFiles = new Map(), root, presentation, inventory } = {}) {
  if (!collection.id || !collection.title || !collection.sourceDir || !collection.outputDir) throw new Error("each collection requires id, title, sourceDir, and outputDir");
  const pages = collection.pages ?? [];
  if (!pages.length) throw new Error(`collection ${collection.id} has no pages`);
  const glossary = collection.glossary ? JSON.parse(await readFile(collection.glossary, "utf8")) : {};
  await replaceDirectory(collection.outputDir, async staging => {
    for (const [index, page] of pages.entries()) {
      let markdown = projectAudience(await readFile(path.join(collection.sourceDir, page.file), "utf8"), collection.audience);
      if (collection.strict && /\b(?:TODO|TBD|REPLACE_ME)\b|\[Describe\b|<(?:[a-z-]+-command|api-id|database-id)>/i.test(markdown)) throw new Error(`${collection.id}: unfinished template ${page.file}`);
      const inventoryJson = markdown.includes('{{inventory-report}}') && inventory ? await readFile(inventory.output, 'utf8') : undefined;
      markdown = markdown.replace(/\{\{([a-z0-9-]+)(?:\|([^}]+))?\}\}/gi, (_, key, display) => {
        if (key === "inventory-report") {
          if (!inventory) throw new Error(`${collection.id}: inventory-report needs inventory configuration`);
          return renderInventory(JSON.parse(inventoryJson));
        }
        if (key.startsWith("review-")) {
          if (!campaign) throw new Error(`${collection.id}: ${key} needs campaign configuration`);
          return renderCampaign(campaign, key, { evidenceHref: e => e.path && root ? slash(path.relative(path.dirname(path.join(collection.sourceDir, page.file)), path.resolve(root, e.path))) : undefined });
        }
        const term = glossary[key];
        if (!term?.label || !term?.definition) throw new Error(`unknown glossary term: ${key}`);
        const glossaryPage = pages.find(p => p.glossary);
        if (!glossaryPage) throw new Error(`${collection.id}: mark the glossary page with glossary: true`);
        const href = slash(path.relative(path.dirname(page.file), glossaryPage.file)) + `#${key}`;
        return `<a class="term" href="${escape(href)}" title="${escape(term.definition)}" data-tooltip="${escape(term.definition)}">${escape(display ?? term.label)}</a>`;
      });
      if (page.glossary) markdown += `\n\n${Object.entries(glossary).map(([key, term]) => `<h2 id="${escape(key)}">${escape(term.label)}</h2>\n<p>${escape(term.definition)}</p>`).join("\n\n")}`;
      let body = rewriteLinks(await marked.parse(markdown), page, collection, collections, publishedFiles);
      body = body.replace(/<img src="([^"]+)" alt="([^"]*)"\s*\/?>/g, (whole, src, alt) => {
        if (!alt.trim()) throw new Error(`${page.file}: image needs meaningful alternative text`);
        if (collection.screenshots && /\.(?:png|jpe?g|webp)(?:[?#]|$)/i.test(src)) return `<a class="screenshot" href="${src}" target="_blank" rel="noopener" aria-label="Open full-size screenshot: ${alt}"><img src="${src}" alt="${alt}" loading="lazy"></a>`;
        return whole;
      });
      const headings = [...body.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)];
      const toc = headings.length ? `<details class="contents"><summary>On this page</summary><ul>${headings.map(([, , id, title]) => `<li><a href="#${id}">${title.replace(/<[^>]*>/g, "")}</a></li>`).join("")}</ul></details>` : "";
      let group;
      const navigation = pages.map(candidate => {
        const heading = candidate.group && candidate.group !== group ? `<li class="nav-group">${escape(candidate.group)}</li>` : "";
        group = candidate.group;
        const href = slash(path.relative(path.dirname(outputName(page)), outputName(candidate)));
        return `${heading}<li data-nav-item><a href="${escape(href)}"${candidate.file === page.file ? ' aria-current="page"' : ""}>${escape(candidate.label ?? candidate.file)}</a></li>`;
      }).join("\n");
      const artifacts = (collection.artifacts ?? []).map(link => {
        if (collection.portable && /^file:/i.test(link.href)) throw new Error(`${collection.id}: nonportable artifact link`);
        if (collection.bundled) throw new Error(`${collection.id}: help bundles cannot contain artifact navigation`);
        const href = /^[a-z]+:|^\//i.test(link.href) ? link.href : slash(path.relative(path.dirname(outputName(page)), link.href));
        return `<a href="${escape(href)}">${escape(link.label)}</a>`;
      }).join("\n");
      const adjacent = collection.guide ? `<nav class="page-steps" aria-label="Adjacent chapters">${[pages[index - 1], pages[index + 1]].filter(Boolean).map(p => `<a href="${escape(slash(path.relative(path.dirname(outputName(page)), outputName(p))))}">${p === pages[index - 1] ? "← " : ""}${escape(p.label ?? p.file)}${p === pages[index + 1] ? " →" : ""}</a>`).join("")}</nav>` : "";
      const prefix = slash(path.relative(path.dirname(outputName(page)), "."));
      const assetUrl = file => `${prefix ? `${prefix}/` : ""}${file}`;
      let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(page.label ?? page.file)} · ${escape(collection.title)}</title><link rel="stylesheet" href="${assetUrl("site.css")}"></head><body><a class="skip" href="#content">Skip to content</a><header class="masthead"><div><strong>${escape(collection.title)}</strong><small>${escape(collection.subtitle ?? "")}</small></div><button type="button" data-print>Print</button></header><div class="layout"><nav class="sidebar" aria-label="Documentation"><label for="nav-filter">Find a page</label><input id="nav-filter" type="search" data-nav-filter><ul>${navigation}</ul>${artifacts ? `<div class="artifact-links">${artifacts}</div>` : ""}</nav><main id="content" class="content">${toc}${body}${adjacent}<footer class="provenance">Generated from maintained documentation sources. ${collection.bundled ? "Bundled with this application; illustrations are separate from workflow acceptance." : "Build and evidence provenance: .reviewdocs-provenance.json."}</footer></main></div><script src="${assetUrl("site.js")}"></script></body></html>\n`;
      if (presentation) html = await presentation.renderPage({
        title: collection.title, label: page.label ?? page.file, options: presentation.options,
        homeHref: slash(path.relative(path.dirname(outputName(page)), outputName(pages[0]))),
        assetPrefix: prefix ? `${prefix}/` : '',
        navigation: pages.map((candidate, i) => ({ label: candidate.label ?? candidate.file, href: slash(path.relative(path.dirname(outputName(page)), outputName(candidate))), current: candidate === page, group: candidate.group && candidate.group !== pages[i - 1]?.group ? candidate.group : undefined })),
        links: (collection.artifacts ?? []).map(link => ({ ...link, href: /^[a-z]+:|^\//i.test(link.href) ? link.href : slash(path.relative(path.dirname(outputName(page)), link.href)) })),
        body: `${toc}${body}${adjacent}<footer class="provenance">${collection.bundled ? 'Bundled application help.' : 'Build and evidence provenance: .reviewdocs-provenance.json.'}</footer>`
      });
      const filename = path.join(staging, outputName(page));
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, html);
    }
    if (!presentation) await writeFile(path.join(staging, "site.css"), stylesheet);
    await copyPresentation(presentation, staging);
    await writeFile(path.join(staging, "site.js"), javascript);
    for (const asset of collection.assets ?? []) await cp(path.resolve(collection.sourceDir, asset), path.join(staging, asset), { recursive: true });
  });
  console.log(`built ${collection.id}: ${collection.outputDir}`);
}
