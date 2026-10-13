import path from "node:path";
import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { filesBelow } from './files.mjs';

export const publicationManifest = '.reviewdocs-publication.json';
export function publicFilename(name) {
  return !name.split(/[\\/]/).some(part=>part.startsWith('.') || part==='source') && /\.(?:html|css|js|png|jpe?g|webp|gif|svg|avif|ico|woff2?|ttf)$/i.test(name);
}
export async function registerPublication(root) {
  const files=(await filesBelow(root)).map(file=>path.relative(root,file).split(path.sep).join('/'));
  for(const name of files) if(!publicFilename(name)) throw new Error(`refusing non-public generated file: ${name}`);
  await writeFile(path.join(root,publicationManifest),JSON.stringify({formatVersion:1,files:files.sort()})+'\n');
}
export async function publishedFiles(root) {
  const manifest=JSON.parse(await readFile(path.join(root,publicationManifest),'utf8'));
  if(manifest.formatVersion!==1 || !Array.isArray(manifest.files)) throw new Error('invalid publication manifest');
  const files=new Set(manifest.files);
  for(const name of files) if(typeof name!=='string' || !publicFilename(name) || path.isAbsolute(name) || name.split('/').includes('..')) throw new Error('invalid publication filename');
  return files;
}

// Authored asset directories contain illustrations only. Renderer-owned JS/CSS
// is installed separately; arbitrary source, evidence and archives are never assets.
export async function assertIllustrationAssets(directory) {
  const metadata = await lstat(directory);
  if (metadata.isSymbolicLink()) throw new Error(`refusing asset symlink: ${directory}`);
  if (metadata.isDirectory()) {
    for (const name of await readdir(directory)) await assertIllustrationAssets(path.join(directory, name));
  } else if (!/\.(?:png|jpe?g|webp|gif|svg|avif|ico)$/i.test(directory)) {
    throw new Error(`refusing non-illustration publication: ${directory}; cite repository filenames as text`);
  }
}
export function assertDocumentationLink(target) {
  const decoded = decodeURIComponent(target).split(/[?#]/)[0];
  if (!decoded || target.startsWith("#")) return;
  if (/^(?:https?:|\/\/)/i.test(target)) {
    if (/\.(?:go|py|sql|tsx?|jsx?|sh|json|ya?ml|zip|tgz|gz|log|txt)$/i.test(decoded) || /github\.com\/[^/]+\/[^/]+\/(?:blob|raw|tree)\//i.test(decoded))
      throw new Error(`non-document link: ${target}`);
    return;
  }
  if (!/\.html$/i.test(decoded)) throw new Error(`non-document link: ${target}; publish documentation as a page and cite files as text`);
}

// Third-party schema producers may emit source dumps and image-download links.
// Keep their rendered documentation and renderer assets, remove source dumps.
export async function sanitizeSchemaPublication(directory) {
  const { readFile, writeFile, rm } = await import('node:fs/promises');
  const { filesBelow } = await import('./files.mjs');
  for (const file of await filesBelow(directory)) {
    if (/\.(?:sql|dot|mmd|xml)$/i.test(file)) { await rm(file); continue; }
    if (!file.endsWith('.html')) continue;
    const html = (await readFile(file, 'utf8')).replace(/<a\b([^>]*?)href=(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi, (whole, before, double, single, bare, after, label) => {
      try { assertDocumentationLink(double ?? single ?? bare); return whole; }
      catch { return label; }
    });
    await writeFile(file, html);
  }
}

export function assertPageLinks(html) {
  for (const match of html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    assertDocumentationLink((match[1] ?? match[2] ?? match[3]).replaceAll('&amp;', '&'));
  }
}
