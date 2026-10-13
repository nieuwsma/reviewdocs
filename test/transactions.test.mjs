import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,readFile,access} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import{replaceDirectory}from'../src/files.mjs';import{publish,publishOwnedFiles}from'../src/transactions.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rm } from 'node:fs/promises';
test('concurrent publications serialize without deleting another generation',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'reviewdocs-transaction-'));const target=path.join(root,'site');await mkdir(target);await writeFile(path.join(target,'index'),'old');
 let release,started;const gate=new Promise(r=>release=r), ready=new Promise(r=>started=r);
 const first=replaceDirectory(target,async stage=>{await writeFile(path.join(stage,'index'),'first');started();await gate;});await ready;
 const second=replaceDirectory(target,stage=>writeFile(path.join(stage,'index'),'second'));release();await Promise.all([first,second]);assert.equal(await readFile(path.join(target,'index'),'utf8'),'second');
 await assert.rejects(()=>replaceDirectory(target,async()=>{throw new Error('writer failed');}),/writer failed/);assert.equal(await readFile(path.join(target,'index'),'utf8'),'second');
});
test('post-install failure restores output and its private proof together',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'reviewdocs-rollback-')), target=path.join(root,'site'), metadataFile=path.join(root,'proof.json');await mkdir(target);await writeFile(path.join(target,'index'),'old');await writeFile(metadataFile,'old-proof');
 await assert.rejects(()=>publish(target,stage=>writeFile(path.join(stage,'index'),'new'),{metadataFile,metadata:async()=> 'new-proof',afterInstall:async()=>{throw new Error('inputs changed');}}),/inputs changed/);
 assert.equal(await readFile(path.join(target,'index'),'utf8'),'old');assert.equal(await readFile(metadataFile,'utf8'),'old-proof');
});
test('a later publisher recovers a dead writer after its output was moved aside',async()=>{
 const root=await (await import('node:fs/promises')).realpath(await mkdtemp(path.join(tmpdir(),'reviewdocs-recovery-'))),target=path.join(root,'site'),lock=`${target}.reviewdocs-lock`,token='12345678-1234-1234-1234-123456789abc',stage=path.join(root,'.reviewdocs-stage-abandoned');
 await mkdir(lock);await mkdir(stage);await mkdir(path.join(stage,'generation'));await writeFile(path.join(lock,'owner.json'),JSON.stringify({pid:99999999,host:(await import('node:os')).hostname()}));
 const backup=`${target}.reviewdocs-backup-${token}`;await mkdir(backup);await writeFile(path.join(backup,'index'),'previous');
 await writeFile(path.join(lock,'journal.json'),JSON.stringify({token,stage,stageTarget:target,status:'prepared',entries:[{target,source:path.join(stage,'generation'),backup,hadOriginal:true}]}));
 await assert.rejects(()=>publish(target,async()=>{throw new Error('stop after recovery');}),/stop after recovery/);
 assert.equal(await readFile(path.join(target,'index'),'utf8'),'previous');
});
test('owned portal files can be retired while unowned siblings survive',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'reviewdocs-owned-files-')),site=path.join(root,'site');await mkdir(site);await writeFile(path.join(site,'site.js'),'old');await writeFile(path.join(site,'manual.html'),'consumer-owned');
 await publishOwnedFiles(site,['index.html','site.js'],stage=>writeFile(path.join(stage,'index.html'),'new'));
 assert.equal(await readFile(path.join(site,'index.html'),'utf8'),'new');await assert.rejects(()=>readFile(path.join(site,'site.js')),/ENOENT/);assert.equal(await readFile(path.join(site,'manual.html'),'utf8'),'consumer-owned');
});

test('two independent CLI builds preserve a complete generation and private proof', async () => {
 const root=await mkdtemp(path.join(tmpdir(),'reviewdocs-cli-concurrency-'));
 await mkdir(path.join(root,'source'));
 await writeFile(path.join(root,'source','README.md'),'# Concurrent documentation\n\nA complete generation.\n');
 await writeFile(path.join(root,'reviewdocs.config.mjs'),`export default {collections:[{id:'manual',title:'Manual',sourceDir:'source',outputDir:'public/manual',pages:[{file:'README.md',output:'index.html'}]}]};`);
 const binary=fileURLToPath(new URL('../bin/reviewdocs.mjs',import.meta.url));
 const run=args=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[binary,...args],{cwd:root,stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
  child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(new Error(`CLI exited ${code}: ${output}`)));
 });
 await Promise.all([run(['build']),run(['build'])]);
 await run(['verify']);
 assert.match(await readFile(path.join(root,'public/manual/index.html'),'utf8'),/Concurrent documentation/);
 const entries=await (await import('node:fs/promises')).readdir(path.join(root,'public'));
 assert.deepEqual(entries,['manual']);
});

test('failed installation rename restores the previous generation', async () => {
 const root=await mkdtemp(path.join(tmpdir(),'reviewdocs-rename-failure-'));
 const target=path.join(root,'site'),metadataFile=path.join(root,'proof.json');
 await mkdir(target);await writeFile(path.join(target,'index'),'old');await writeFile(metadataFile,'old-proof');
 await assert.rejects(()=>publish(target,stage=>writeFile(path.join(stage,'index'),'new'),{
  metadataFile,
  metadata:async generation=>{await rm(generation,{recursive:true});return 'new-proof';},
 }),{code:'ENOENT'});
 assert.equal(await readFile(path.join(target,'index'),'utf8'),'old');
 assert.equal(await readFile(metadataFile,'utf8'),'old-proof');
});

test('a killed publisher is recovered by a different process', async () => {
 const root=await mkdtemp(path.join(tmpdir(),'reviewdocs-killed-publisher-'));
 const target=path.join(root,'site'),metadataFile=path.join(root,'proof.json');
 await mkdir(target);await writeFile(path.join(target,'index'),'old');await writeFile(metadataFile,'old-proof');
 const moduleUrl=new URL('../src/transactions.mjs',import.meta.url).href;
 const program=`import {publish} from ${JSON.stringify(moduleUrl)};import {writeFile} from 'node:fs/promises';import path from 'node:path';await publish(process.argv[1],stage=>writeFile(path.join(stage,'index'),'new'),{metadataFile:process.argv[2],metadata:async()=> 'new-proof',afterInstall:async()=>{console.log('INSTALLED');await new Promise(()=>setInterval(()=>{},1000));}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',program,target,metadataFile],{stdio:['ignore','pipe','pipe']});
 const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 try {
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('publisher did not reach installed state')),10000);
   child.stdout.on('data',chunk=>{if(chunk.toString().includes('INSTALLED')){clearTimeout(timer);resolve();}});
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.once('close',()=>{clearTimeout(timer);reject(new Error('publisher exited before installation'));});
  });
  child.kill('SIGKILL');await closed;
  await assert.rejects(()=>publish(target,async()=>{throw new Error('stop after recovery');},{metadataFile}),/stop after recovery/);
  assert.equal(await readFile(path.join(target,'index'),'utf8'),'old');
  assert.equal(await readFile(metadataFile,'utf8'),'old-proof');
 } finally {child.kill('SIGKILL');await closed;}
});
