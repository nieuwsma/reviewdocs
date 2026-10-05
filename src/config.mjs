import { pathToFileURL } from "node:url";
import path from "node:path";

export async function loadConfig(filename) {
  const absolute = path.resolve(filename);
  const imported = await import(`${pathToFileURL(absolute).href}?loaded=${Date.now()}`);
  const config = imported.default;
  if (!config || typeof config !== "object") throw new Error(`${filename} must export a configuration object as default`);
  const root = path.dirname(absolute);
  const resolve = value => path.resolve(root, value);
  const collections = (config.collections ?? []).map(collection => ({
    ...collection,
    sourceDir: resolve(collection.sourceDir),
    outputDir: resolve(collection.outputDir),
  }));
  const diagrams = (config.diagrams ?? []).map(group => ({ ...group, sourceDir: resolve(group.sourceDir), outputDir: resolve(group.outputDir) }));
  const openapi = (config.openapi ?? []).map(document => ({ ...document, source: resolve(document.source), outputDir: resolve(document.outputDir) }));
  const inventory = config.inventory ? {
    ...config.inventory,
    root: resolve(config.inventory.root ?? "."),
    output: resolve(config.inventory.output),
  } : undefined;
  const databaseDocs = config.databaseDocs ? {
    ...config.databaseDocs,
    outputDir: resolve(config.databaseDocs.outputDir),
    temporaryRoot: resolve(config.databaseDocs.temporaryRoot ?? ".local"),
  } : undefined;
  return { ...config, root, collections, diagrams, openapi, inventory, databaseDocs };
}

export function artifactSelected(id, only) {
  return only.length === 0 || only.includes(id);
}
