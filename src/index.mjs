import { artifactSelected, loadConfig } from "./config.mjs";
import { buildCollection } from "./site.mjs";
import { buildOpenApi, validateOpenApi } from "./openapi.mjs";
import { buildDiagrams } from "./diagrams.mjs";
import { buildInventory } from "./inventory.mjs";
import { buildDatabaseDocs } from "./database.mjs";
import { assertDeterministic, validateSite } from "./check.mjs";
import { initializeProject } from "./init.mjs";

export { initializeProject };

export async function buildAll(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath);
  for (const diagrams of config.diagrams) if (artifactSelected(diagrams.id, only)) await buildDiagrams(diagrams);
  if (config.inventory && artifactSelected(config.inventory.id ?? "inventory", only)) await buildInventory(config.inventory);
  for (const document of config.openapi) if (artifactSelected(document.id, only)) await buildOpenApi(document);
  if (config.databaseDocs && artifactSelected(config.databaseDocs.id ?? "database", only)) await buildDatabaseDocs(config.databaseDocs, config.root);
  for (const collection of config.collections) if (artifactSelected(collection.id, only)) await buildCollection(collection);
}

export async function checkAll(configPath, { only = [] } = {}) {
  const config = await loadConfig(configPath);
  await buildAll(configPath, { only });
  for (const collection of config.collections) {
    if (!artifactSelected(collection.id, only)) continue;
    await assertDeterministic(collection.outputDir, () => buildCollection(collection));
    const count = await validateSite(collection.outputDir);
    console.log(`checked ${collection.id}: deterministic, ${count} HTML pages, local links valid`);
  }
  for (const document of config.openapi) {
    if (!artifactSelected(document.id, only)) continue;
    await assertDeterministic(document.outputDir, () => buildOpenApi(document));
    await validateOpenApi(document);
    console.log(`checked ${document.id}: deterministic and source-identical`);
  }
}
