import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { parse as parseYaml } from "yaml";
import { replaceDirectory } from "./files.mjs";

const require = createRequire(import.meta.url);
const swaggerAssets = path.dirname(require.resolve("swagger-ui-dist/package.json"));
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function pointer(root, reference) {
  if (!reference.startsWith("#/")) return undefined;
  return reference.slice(2).split("/").reduce((value, part) => value?.[part.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function dereference(root, value, ancestry = new Set()) {
  if (Array.isArray(value)) return value.map(item => dereference(root, item, ancestry));
  if (!value || typeof value !== "object") return value;
  if (typeof value.$ref === "string") {
    if (ancestry.has(value.$ref)) return value;
    const target = pointer(root, value.$ref);
    if (target !== undefined) {
      const next = new Set(ancestry); next.add(value.$ref);
      return dereference(root, { ...target, ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$ref")) }, next);
    }
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, dereference(root, item, ancestry)]));
}

export async function loadContract(source) {
  const text = await readFile(source, "utf8");
  if (/\.ya?ml$/i.test(source)) return parseYaml(text);
  return JSON.parse(text);
}

export async function buildOpenApi(document) {
  const contract = await loadContract(document.source);
  const embedded = JSON.stringify(dereference(contract, contract)).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  const title = document.title ?? contract.info?.title ?? "API reference";
  const sourceLabel = escape(path.relative(document.outputDir, document.source));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><link rel="stylesheet" href="swagger-ui.css"><style>body{margin:0;background:#fafafa}.intro{padding:1rem 4%;border-bottom:1px solid #d8dee5;background:white;font:15px/1.5 system-ui}.intro h1{margin:0}.intro p{max-width:90ch}</style></head><body><header class="intro"><h1>${escape(title)}</h1><p>Offline API documentation. Interactive requests are disabled. This documentation is generated from ${sourceLabel} and replaced on every build. Edit that source. Edits in this directory are discarded.</p></header><main id="swagger-ui"></main><script id="openapi" type="application/json">${embedded}</script><script src="swagger-ui-bundle.js"></script><script>SwaggerUIBundle({spec:JSON.parse(document.querySelector('#openapi').textContent),dom_id:'#swagger-ui',deepLinking:true,displayOperationId:true,filter:true,supportedSubmitMethods:[],tryItOutEnabled:false,validatorUrl:null});</script></body></html>\n`;
  await replaceDirectory(document.outputDir, async staging => {
    await writeFile(path.join(staging, "index.html"), html);
    await copyFile(path.join(swaggerAssets, "swagger-ui.css"), path.join(staging, "swagger-ui.css"));
    await copyFile(path.join(swaggerAssets, "swagger-ui-bundle.js"), path.join(staging, "swagger-ui-bundle.js"));
  });
  console.log(`built ${document.id}: ${document.outputDir}`);
}

export async function validateOpenApi(document) {
  const source = await loadContract(document.source);
  const html = await readFile(path.join(document.outputDir, "index.html"), "utf8");
  const generated=JSON.parse(html.match(/<script id="openapi" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? "null");
  if(JSON.stringify(dereference(source,source))!==JSON.stringify(generated)) throw new Error(`${document.id}: generated OpenAPI differs from source`);
  if (!html.includes("SwaggerUIBundle") || !html.includes("supportedSubmitMethods:[]")) throw new Error(`${document.id}: incomplete Swagger UI output`);
  if (html.match(/<script id="openapi"[\s\S]*<\/script>/)?.[0].includes('"$ref"')) throw new Error(`${document.id}: embedded contract contains unresolved local references`);
}
