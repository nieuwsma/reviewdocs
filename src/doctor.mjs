import {selectArtifacts} from "./plan.mjs";
import path from 'node:path';
import {access,readFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {loadConfig} from './config.mjs';
import {verifyProvenance,provenancePath,version} from './provenance.mjs';
import {verifyEvidence} from './evidence.mjs';
import {validateScreenshots} from './screenshots.mjs';

async function available(command) {
  const candidates=command.includes(path.sep) ? [path.resolve(command)] : (process.env.PATH??'').split(path.delimiter).map(root=>path.join(root,command));
  for(const file of candidates) try {await access(file,constants.X_OK);return true;} catch {}
  return false;
}
function classify(error) {
  if(error.code==='ENOENT' || /missing provenance/.test(error.message)) return 'missing';
  if(/stale|toolkit|fingerprint/.test(error.message)) return 'stale';
  if(/unavailable|declare migration/.test(error.message)) return 'unavailable';
  return 'invalid';
}
export async function doctor(configPath,{only=[]}={}) {
  const report={schemaVersion:1,toolkitVersion:version,status:'fresh',results:[]};
  let config;
  try {config=await loadConfig(configPath,{only,inspect:true});}
  catch(error) {return {...report,status:'invalid',results:[{id:'configuration',code:'RD_CONFIG_INVALID',state:'invalid',message:error.message,command:null}]};}
  const items=[...config.artifacts,...config.evidence,...config.screenshots];
  for(const id of only) if(!items.some(item=>item.id===id)) return {...report,status:'invalid',results:[{id,code:'RD_UNKNOWN_ID',state:'invalid',message:'unknown artifact id',command:null}]};
  for(const item of selectArtifacts(config,only,{includeEvidence:true,includeScreenshots:true})) {
    const evidence=config.evidence.includes(item),screenshot=config.screenshots.includes(item);
    const result={id:item.id,code:'RD_FRESH',state:'fresh',dependencies:item.dependsOn??[],inputs:item.inputs??[],command:screenshot ? 'Refresh screenshots using the configured consumer capture procedure' : `reviewdocs ${evidence?'evidence':'build'} --config ${JSON.stringify(configPath)} --only ${item.id}`,prerequisites:[]};
    if(evidence) result.prerequisites.push({name:item.command[0],available:await available(item.command[0])});
    if(item.inspectionError) { result.state='invalid';result.message=item.inspectionError; }
    if(item===config.databaseDocs) result.prerequisites.push({name:'docker',available:await available('docker')});
    if(config.diagrams.includes(item)) result.prerequisites.push({name:'mmdc',available:await available('mmdc')});
    try {
      if(evidence) await verifyEvidence(config,item);
      else if(screenshot) await validateScreenshots(item,config.root);
      else await verifyProvenance(config,item);
    } catch(error) {result.state=classify(error);result.message=error.message;}
    if(result.state!=='fresh' && result.prerequisites.some(p=>!p.available)) result.state='unavailable';
    result.code=`RD_${result.state.toUpperCase()}`;
    report.results.push(result);
  }
  if(report.results.some(r=>r.state!=='fresh')) report.status='attention';
  return report;
}
