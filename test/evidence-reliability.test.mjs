import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runEvidence,verifyEvidence,redact} from '../src/evidence.mjs';
async function fixture(command, options={}) {
 const root=await mkdtemp(path.join(tmpdir(),'reviewdocs-proof-'));await writeFile(path.join(root,'source'),'fixture');
 const lane={id:'proof',proof:'mocked',inputs:['source'],outputDir:path.join(root,'proof'),cwd:root,timeoutMs:500,...options,command:[process.execPath,'-e',command]};return {config:{root},lane};
}
test('timeout cannot advance passing pointer, even with a zero-exit signal handler',async()=>{
 const {config,lane}=await fixture('console.log("passed")');let result=await runEvidence(config,lane);assert.equal(result.status,'passed');
 const pointer=await readFile(path.join(lane.outputDir,'latest.json'),'utf8');
 lane.command=[process.execPath,'-e',"process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000)"];
 result=await runEvidence(config,lane);assert.equal(result.timedOut,true);assert.equal(result.exitCode,0);assert.equal(result.status,'failed');assert.equal(await readFile(path.join(lane.outputDir,'latest.json'),'utf8'),pointer);
 const past=JSON.parse(pointer);const file=path.join(lane.outputDir,past.run,'run.json');const saved=JSON.parse(await readFile(file,'utf8'));saved.timedOut=true;await writeFile(file,JSON.stringify(saved));await assert.rejects(()=>verifyEvidence(config,lane),/nonpassing/);
});
test('captured logs are bounded and redact chunk-split and truncated credentials',async()=>{
 const {config,lane}=await fixture("process.stdout.write('Bearer ');setTimeout(()=>process.stdout.write('fake-token '+ 'x'.repeat(10000)),20)",{maxLogBytes:80});const result=await runEvidence(config,lane);assert.equal(result.status,'passed');assert.equal(result.logTruncated,true);
 const pointer=JSON.parse(await readFile(path.join(lane.outputDir,'latest.json'),'utf8'));const log=await readFile(path.join(lane.outputDir,pointer.run,'command.log'),'utf8');assert.doesNotMatch(log,/fake-token/);assert.match(log,/TRUNCATED/);assert.ok(log.length<150);
 assert.equal(redact('-----BEGIN PRIVATE KEY-----\nprivate material'),'[REDACTED PRIVATE KEY]');
});
test('verification requires declared result outputs and complete no-skip counts',async()=>{
 const {config,lane}=await fixture("require('node:fs').writeFileSync(process.env.REVIEWDOCS_RUN_DIR+'/counts.json',JSON.stringify({tests:1,passed:1,failed:0,skipped:0}))",{resultFile:'counts.json',requireNoSkips:true});const result=await runEvidence(config,lane);assert.equal(result.status,'passed');await verifyEvidence(config,lane);
 const pointer=JSON.parse(await readFile(path.join(lane.outputDir,'latest.json'),'utf8'));const file=path.join(lane.outputDir,pointer.run,'run.json');const record=JSON.parse(await readFile(file,'utf8'));record.outputs=[];await writeFile(file,JSON.stringify(record));await assert.rejects(()=>verifyEvidence(config,lane),/incomplete/);
});

test('failed and incomplete runs retain proof without replacing the passing pointer', async t => {
 const scenarios = [
  ['spawn failure', 'unavailable', null],
  ['missing output', 'partial', 'console.log("done")', {outputs:['required.txt']}],
  ['malformed results', 'partial', "require('node:fs').writeFileSync(process.env.REVIEWDOCS_RUN_DIR+'/counts.json','{')"],
  ['mismatched counts', 'partial', {tests:2,passed:1,failed:0,skipped:0}],
  ['skipped tests', 'partial', {tests:2,passed:1,failed:0,skipped:1}],
  ['reported failure', 'failed', {tests:1,passed:0,failed:1,skipped:0}],
  ['nonzero exit with skipped results', 'failed', "require('node:fs').writeFileSync(process.env.REVIEWDOCS_RUN_DIR+'/counts.json',JSON.stringify({tests:1,passed:0,failed:0,skipped:1}));process.exit(1)"],
  ['nonzero exit with changed inputs', 'failed', "require('node:fs').writeFileSync('source','changed');process.exit(1)", {}],
  ['invalid count', 'partial', {tests:-1,passed:1,failed:0,skipped:0}],
  ['changed inputs', 'partial', "require('node:fs').writeFileSync('source','changed')", {}],
  ['forced termination', 'failed', "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)", {}],
 ];
 for (const [name,status,command,options] of scenarios) await t.test(name, async () => {
  const {config,lane}=await fixture('console.log("passed")');
  await runEvidence(config,lane);
  const pointer=await readFile(path.join(lane.outputDir,'latest.json'),'utf8');
  Object.assign(lane, options ?? {resultFile:'counts.json',requireNoSkips:true});
  lane.command=command===null ? [path.join(config.root,'nonexistent-command')] : [process.execPath,'-e',typeof command==='object' ? `require('node:fs').writeFileSync(process.env.REVIEWDOCS_RUN_DIR+'/counts.json',${JSON.stringify(JSON.stringify(command))})` : command];
  const record=await runEvidence(config,lane);
  assert.equal(record.status,status);
  assert.equal(await readFile(path.join(lane.outputDir,'latest.json'),'utf8'),pointer);
  const retained=await (await import('node:fs/promises')).readdir(lane.outputDir);
  assert.equal(retained.filter(name=>name.startsWith('run-')).length,2);
  if(name==='forced termination') {assert.equal(record.timedOut,true);assert.equal(record.exitCode,null);}
 });
});
