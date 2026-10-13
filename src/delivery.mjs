import {publishedFiles,publicationManifest} from "./publication.mjs";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, writeFile, realpath, stat, cp } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { escapeHtml as esc, slash, inside } from "./paths.mjs";
import { stylesheet } from "./ui.mjs";
import { exists } from "./files.mjs";
import { validateSite } from "./check.mjs";

import { copyPresentation } from "./presentation.mjs";
import { javascript } from "./ui.mjs";

export async function buildLanding(configuration, collections, presentation) {
  await mkdir(configuration.outputDir, { recursive: true });
  const links = collections.filter(c => !c.bundled).map(c => `<li><a href="${esc(slash(path.relative(configuration.renderOutputDir ?? configuration.outputDir, path.join(c.outputDir, c.pages[0].output ?? c.pages[0].file.replace(/\.md$/, ".html")))))}">${esc(c.title)}</a><p>${esc(c.subtitle ?? "")}</p></li>`).join("");
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(configuration.title ?? "Documentation")}</title><style>${stylesheet}</style></head><body><main class="content"><h1>${esc(configuration.title ?? "Documentation")}</h1><p>Choose the documentation for your task.</p><ul>${links}</ul></main></body></html>\n`;
  if (presentation) {
    html = await presentation.renderPage({ title: configuration.title ?? 'Documentation', label: 'Documentation', homeHref: 'index.html', options: presentation.options, body: `<h1>${esc(configuration.title ?? 'Documentation')}</h1><p>Choose the documentation for your task.</p><ul>${links}</ul>` });
    await copyPresentation(presentation, configuration.outputDir);
    await writeFile(path.join(configuration.outputDir, 'site.js'), javascript);
  }
  await writeFile(path.join(configuration.outputDir, 'index.html'), html);
}
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
export async function serveDocs(directory, { port = 0 } = {}) {
  const root = await realpath(directory);
  const owned=await exists(path.join(root,publicationManifest)) ? await publishedFiles(root) : undefined;
  const server = createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (pathname.split("/").some(segment => segment.startsWith("."))) throw new Error("hidden path");
      let filename = path.resolve(root, `.${pathname}`);
      if (!inside(root, filename)) throw new Error("outside root");
      if ((await stat(filename)).isDirectory()) filename = path.join(filename, "index.html");
      filename = await realpath(filename);
      if (!inside(root, filename)) throw new Error("symlink outside root");
      if (!types[path.extname(filename).toLowerCase()] || pathname.includes("/assets/source/")) throw new Error("not a documentation asset");
      if(owned && !owned.has(slash(path.relative(root,filename)))) throw new Error("unowned file");
      const metadata = await stat(filename);
      if (!metadata.isFile()) throw new Error("not a file");
      response.writeHead(200, { "Content-Type": types[path.extname(filename)] ?? "application/octet-stream", "Content-Length": metadata.size, "X-Content-Type-Options": "nosniff" });
      if (request.method === "HEAD") response.end(); else createReadStream(filename).on("error", () => response.destroy()).pipe(response);
    } catch { response.writeHead(404); response.end("Documentation page not found"); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
export function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore" });
  child.on("error", () => console.warn(`Open this URL in a browser: ${url}`));
  child.on("exit", code => { if (code) console.warn(`Open this URL in a browser: ${url}`); });
}
export async function exportDocs(config, destination) {
  const root = config.landing?.outputDir;
  if (!root) throw new Error("export requires a landing outputDir containing the collections");
  if (inside(root, destination) || inside(destination, root)) throw new Error("export destination overlaps generated site");
  if (await exists(destination)) throw new Error("export destination already exists");
  for (const c of config.collections) if (!c.bundled && !inside(root, c.outputDir)) throw new Error("export requires collections below landing outputDir");
  const files=await publishedFiles(root);
  try {
    for(const name of files) {
      const source=path.join(root,name), resolved=await realpath(source);
      if(resolved!==path.join(await realpath(root),name) || !inside(await realpath(root),resolved)) throw new Error('refusing publication symlink');
      const target=path.join(destination,name); await mkdir(path.dirname(target),{recursive:true}); await cp(source,target,{dereference:false});
    }
    await validateSite(destination,{portable:true,root:destination});
  } catch(error) {const {rm}=await import('node:fs/promises');await rm(destination,{recursive:true,force:true});throw error;}

}
