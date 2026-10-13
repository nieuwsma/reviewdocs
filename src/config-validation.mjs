import {inside} from './paths.mjs';
export function validateProducerSettings(config) {
  const identifier=value=>typeof value==='string' && /^[a-z][a-z0-9-]*$/.test(value);
  const command=value=>Array.isArray(value) && value.length>0 && value.every(part=>typeof part==='string' && part.length>0);
  const ids=new Set([...config.artifacts,...config.evidence].map(a=>a.id));
  for(const group of config.screenshots) {
    if(!identifier(group.id) || ids.has(group.id)) throw new Error(`screenshots: invalid or duplicate id: ${group.id}`);
    ids.add(group.id);
  }
  const database=config.databaseDocs;
  if(database) {
    if(database.port!==undefined && (!Number.isInteger(database.port) || database.port<1 || database.port>65535)) throw new Error(`${database.id}.port: invalid port`);
    if(!inside(config.root,database.temporaryRoot) || database.temporaryRoot===config.root) throw new Error(`${database.id}.temporaryRoot: must be below project root`);
    for(const artifact of config.artifacts) if(artifact.outputDir && inside(artifact.outputDir,database.temporaryRoot)) throw new Error(`${database.id}.temporaryRoot: overlaps public output`);
    const nested=new Set();
    for(const item of database.databases??[]) {
      if(!identifier(item.id) || nested.has(item.id)) throw new Error(`${database.id}.databases: invalid or duplicate database id: ${item.id}`);
      nested.add(item.id);
      if(!command(item.migrate?.command)) throw new Error(`${database.id}.${item.id}.migrate.command: requires nonempty strings`);
      for(const [key,value] of Object.entries(item.migrate.env??{})) if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof value!=='string') throw new Error(`${database.id}.${item.id}.migrate.env: invalid environment setting`);
      for(const field of ['database','schema']) if(item[field]!==undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(item[field])) throw new Error(`${database.id}.${item.id}.${field}: invalid identifier`);
    }
  }
  for(const artifact of config.artifacts) for(const dependency of artifact.dependsOn??[]) if(!identifier(dependency)) throw new Error(`${artifact.id}.dependsOn: invalid identifier`);
}
