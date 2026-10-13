import path from 'node:path';
import {readFile,mkdir,rename,readdir} from 'node:fs/promises';
import {loadConfig,assertNoSymlink} from './config.mjs';
import {exists} from './files.mjs';
import {provenancePath,outputDigest,hash,inputDigest} from './provenance.mjs';
import {withPublicationLock} from './transactions.mjs';
import {safePath} from './paths.mjs';

// Relocation preserves old proof bytes and version. It never certifies a rebuild.
export async function migrateProject(configPath,{dryRun=false}={}) {
  const config=await loadConfig(configPath,{inspect:true});
  const moves=[];
  for(const artifact of config.artifacts) {
    const source=artifact.outputDir ? path.join(artifact.outputDir,'.reviewdocs-provenance.json') : `${artifact.legacyOutput??artifact.output}.provenance.json`;
    if(!await exists(source)) continue;
    await assertNoSymlink(config.root,source);
    const proof=JSON.parse(await readFile(source,'utf8'));
    if(proof.formatVersion!==1 || proof.artifact!==artifact.id || proof.status!=='built') throw new Error(`${artifact.id}: incompatible legacy provenance`);
    if(!Array.isArray(proof.inputs) || !/^[a-f0-9]{64}$/.test(proof.inputHash) || proof.inputs.some(input=>{try{safePath(config.root,input);return false;}catch{return true;}})) throw new Error(`${artifact.id}: invalid legacy source scope`);
    if(artifact.portal) {
      const parts=[hash(await readFile(path.join(artifact.outputDir,'index.html')))];
      if(artifact.presentationAssets) parts.push(hash(await readFile(path.join(artifact.outputDir,'site.js'))),await inputDigest(artifact.outputDir,[artifact.presentationAssets]));
      if(proof.outputHash!==hash(JSON.stringify(parts))) throw new Error(`${artifact.id}: legacy output changed`);
    } else if(artifact.legacyOutput) {
      if(proof.outputHash!==await outputDigest({...artifact,output:artifact.legacyOutput})) throw new Error(`${artifact.id}: legacy output changed`);
      moves.push({source:artifact.legacyOutput,target:artifact.output});
    } else if(proof.outputHash!==await outputDigest({...artifact,provenanceFile:undefined})) throw new Error(`${artifact.id}: legacy output changed`);
    moves.push({source,target:provenancePath(artifact)});
  }
  for(const lane of config.evidence.filter(l=>l.legacyOutputDir)) {
    if(!await exists(lane.legacyOutputDir)) continue;
    await assertNoSymlink(config.root,lane.legacyOutputDir);
    const names=await readdir(lane.legacyOutputDir),runs=new Map();
    for(const name of names) {
      if(name.startsWith('run-')) {
        const runDir=path.join(lane.legacyOutputDir,name),record=JSON.parse(await readFile(path.join(runDir,'run.json'),'utf8'));
        if(record.id!==lane.id || record.formatVersion!==1 || !['passed','failed','partial','unavailable'].includes(record.status) || !Array.isArray(record.outputs) || !record.outputHashes || !/^[a-f0-9]{64}$/.test(record.inputHash)) throw new Error(`${lane.id}: incompatible legacy evidence`);
        for(const output of record.outputs) {const filename=safePath(runDir,output);if(!await exists(filename) || record.outputHashes[output]!==hash(await readFile(filename))) throw new Error(`${lane.id}: changed legacy evidence output ${name}/${output}`);}
        runs.set(name,record);
      }
      else if(!['index.json','latest.json'].includes(name)) throw new Error(`${lane.id}: unexpected legacy evidence file ${name}`);
    }
    if(await exists(path.join(lane.legacyOutputDir,'latest.json'))) {const pointer=JSON.parse(await readFile(path.join(lane.legacyOutputDir,'latest.json'),'utf8')),record=runs.get(pointer.run);if(!record || record.status!=='passed' || record.inputHash!==pointer.inputHash) throw new Error(`${lane.id}: invalid legacy passing pointer`);}
    moves.push({source:lane.legacyOutputDir,target:lane.outputDir});
  }
  for(const move of moves) {await assertNoSymlink(config.root,move.target);if(await exists(move.target)) throw new Error(`migration conflict: ${move.target}`);}
  if(dryRun) return {dryRun:true,moves};
  return withPublicationLock(path.join(config.stateDir,'migration'),async()=>{
    const applied=[];
    try {for(const move of moves) {await mkdir(path.dirname(move.target),{recursive:true});await rename(move.source,move.target);applied.push(move);}}
    catch(error) {for(const move of applied.reverse())await rename(move.target,move.source);throw error;}
    return {dryRun:false,moves};
  });
}
