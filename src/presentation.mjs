import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hash } from './provenance.mjs';
import { readFile } from 'node:fs/promises';
export async function loadPresentation(configuration) {
  if (!configuration) return undefined;
  const module = await import(`${pathToFileURL(configuration.module).href}?version=${hash(await readFile(configuration.module))}`);
  if (typeof module.renderPage !== 'function') throw new Error('presentation module must export renderPage(page)');
  return { ...configuration, renderPage: module.renderPage };
}
export async function copyPresentation(presentation, destination) {
  if (presentation) {
    await rm(path.join(destination, '_presentation'), { recursive: true, force: true });
    await cp(presentation.assets, path.join(destination, '_presentation'), { recursive: true });
  }
}
