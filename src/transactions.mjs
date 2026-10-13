import {mkdir,mkdtemp,lstat,readFile,writeFile,rename,rm,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {hostname} from 'node:os';
import path from 'node:path';
const present=async file=>{try{await lstat(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function atomicWrite(file, content) {
 await mkdir(path.dirname(file),{recursive:true});
 const temporary=`${file}.${randomUUID()}.tmp`;
 try{await writeFile(temporary,content);await rename(temporary,file);}finally{await rm(temporary,{force:true});}
}
async function canonicalPath(value) {
 const suffix=[];let current=path.resolve(value);
 while(!await present(current)) {suffix.unshift(path.basename(current));current=path.dirname(current);}
 return path.join(await realpath(current),...suffix);
}
function dead(owner){if(owner.host!==hostname())return false;try{process.kill(owner.pid,0);return false;}catch(e){return e.code==='ESRCH';}}
async function recover(lock, allowed) {
 const journal=path.join(lock,'journal.json');if(!await present(journal))return;
 const state=JSON.parse(await readFile(journal,'utf8'));
 if(!/^[a-f0-9-]{36}$/.test(state.token) || !Array.isArray(state.entries) || !['prepared','committed'].includes(state.status)) throw new Error('invalid publication recovery journal');
 if(!state.stage || !path.basename(state.stage).startsWith('.reviewdocs-stage-') || !state.entries.length || !allowed.some(root=>root===state.stageTarget) || path.dirname(state.stage)!==path.dirname(state.stageTarget)) throw new Error('unexpected publication staging directory');
 for(const entry of state.entries){
  if(!allowed.some(root=>entry.target===root || entry.target.startsWith(root+path.sep)) || entry.backup!==`${entry.target}.reviewdocs-backup-${state.token}`)throw new Error('publication recovery has an unexpected target; manual inspection required');
 }
 if(state.status!=='committed')for(const entry of [...state.entries].reverse()){
  if(await present(entry.backup)){await rm(entry.target,{recursive:true,force:true});await rename(entry.backup,entry.target);}
  else if(!entry.hadOriginal)await rm(entry.target,{recursive:true,force:true});
 }
 for(const entry of state.entries)await rm(entry.backup,{recursive:true,force:true});
 // Only the journal's owned staging directory is eligible for cleanup.
 await rm(state.stage,{recursive:true,force:true});
 await rm(journal,{force:true});
}
export async function withPublicationLock(target, operation, {lockTarget=target,allowedTargets=[target],lockTimeoutMs=30000}={}) {
 allowedTargets=await Promise.all(allowedTargets.map(canonicalPath));
 await mkdir(path.dirname(lockTarget),{recursive:true});
 const lock=path.join(await realpath(path.dirname(lockTarget)),`${path.basename(lockTarget)}.reviewdocs-lock`);
 const started=Date.now();let acquired=false;
 while(!acquired){
  try{await mkdir(lock);acquired=true;}catch(e){
   if(e.code!=='EEXIST')throw e;
   let owner;try{owner=JSON.parse(await readFile(path.join(lock,'owner.json'),'utf8'));}catch{}
   if(owner&&(dead(owner) || owner.abandoned)){
    const claim=path.join(lock,'recovery');try{await mkdir(claim);}catch(e){if(e.code!=='EEXIST'&&e.code!=='ENOENT')throw e;}
    if(await present(claim)){
     // Only the process whose token owns the recovery claim can reclaim.
     const token=randomUUID(), marker=path.join(claim,'owner');
     try{await writeFile(marker,JSON.stringify({pid:process.pid,host:hostname(),token}),{flag:'wx'});await recover(lock,allowedTargets);await rm(lock,{recursive:true,force:true});continue;}catch(e){
       if(!['EEXIST','ENOENT'].includes(e.code)) throw e;
       if(e.code==='EEXIST') {let claimant;try{claimant=JSON.parse(await readFile(marker,'utf8'));}catch{} if(claimant && dead(claimant)) await rm(marker,{force:true});}
     }
    }
   }
   if(Date.now()-started>=lockTimeoutMs)throw new Error(`publication lock unavailable: ${lock}; inspect owner/recovery state before retrying`);
   await pause(20);
  }
 }
 try{
  await atomicWrite(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,host:hostname(),token:randomUUID()}));
  return await operation(lock);
 }finally{
  const journal=path.join(lock,'journal.json');
  if(await present(journal)) await atomicWrite(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,host:hostname(),abandoned:true}));
  else await rm(lock,{recursive:true,force:true});
 }
}
export async function publish(target, writer, options={}) {
 await mkdir(path.dirname(target),{recursive:true});
 target=path.join(await realpath(path.dirname(target)),path.basename(target));
 const allowedTargets=await Promise.all((options.allowedTargets??[target,...(options.metadataFile?[options.metadataFile]:[])]).map(canonicalPath));
 if(options.metadataFile) options={...options,metadataFile:await canonicalPath(options.metadataFile)};
 return withPublicationLock(target,async lock=>{
  const stage=await mkdtemp(path.join(path.dirname(target),'.reviewdocs-stage-'));
  const generation=path.join(stage,'generation');const token=randomUUID();const entries=[];
  try{
   if(options.file)await writer(generation);else{await mkdir(generation);await writer(generation);}
   if(options.beforePublish)await options.beforePublish(generation);
   entries.push({target,source:generation,backup:`${target}.reviewdocs-backup-${token}`,hadOriginal:await present(target)});
   if(options.metadataFile){
    const meta=path.join(stage,'metadata.json');await writeFile(meta,await options.metadata(generation));
    entries.push({target:options.metadataFile,source:meta,backup:`${options.metadataFile}.reviewdocs-backup-${token}`,hadOriginal:await present(options.metadataFile)});
   }
   const journal={token,stage,stageTarget:target,status:'prepared',entries};await atomicWrite(path.join(lock,'journal.json'),JSON.stringify(journal));
   for(const entry of entries){await mkdir(path.dirname(entry.target),{recursive:true});if(entry.hadOriginal)await rename(entry.target,entry.backup);await rename(entry.source,entry.target);}
   if(options.afterInstall)await options.afterInstall();
   journal.status='committed';await atomicWrite(path.join(lock,'journal.json'),JSON.stringify(journal));
   await recover(lock,allowedTargets);
  }catch(error){await recover(lock,allowedTargets);throw error;}finally{await rm(stage,{recursive:true,force:true});}
 },{...options,allowedTargets});
}
// Portals own a finite file set, not their nested collection directories.
export async function publishOwnedFiles(root, names, writer, options={}) {
 await mkdir(root,{recursive:true});root=await realpath(root);
 const allowedTargets=await Promise.all((options.allowedTargets??[root,...(options.metadataFile?[options.metadataFile]:[])]).map(canonicalPath));
 if(options.metadataFile) options={...options,metadataFile:await canonicalPath(options.metadataFile)};
 return withPublicationLock(root,async lock=>{
  const stage=await mkdtemp(path.join(path.dirname(root),'.reviewdocs-stage-'));const token=randomUUID();let journal;
  try{
   await writer(stage);
   if(options.beforePublish)await options.beforePublish(stage);
   const entries=[];
   for(const name of names){const target=path.join(root,name);entries.push({target,source:path.join(stage,name),backup:`${target}.reviewdocs-backup-${token}`,hadOriginal:await present(target)});}
   if(options.metadataFile){const source=path.join(stage,'metadata.json');await writeFile(source,await options.metadata(stage));entries.push({target:options.metadataFile,source,backup:`${options.metadataFile}.reviewdocs-backup-${token}`,hadOriginal:await present(options.metadataFile)});}
   journal={token,stage,stageTarget:root,status:'prepared',entries};await atomicWrite(path.join(lock,'journal.json'),JSON.stringify(journal));
   for(const e of entries){await mkdir(path.dirname(e.target),{recursive:true});if(e.hadOriginal)await rename(e.target,e.backup);if(await present(e.source))await rename(e.source,e.target);}
   if(options.afterInstall)await options.afterInstall();journal.status='committed';await atomicWrite(path.join(lock,'journal.json'),JSON.stringify(journal));await recover(lock,allowedTargets);
  }catch(error){await recover(lock,allowedTargets);throw error;}finally{await rm(stage,{recursive:true,force:true});}
 },{...options,allowedTargets});
}
