import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,stat,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {doctor} from '../src/doctor.mjs';

async function project() {
 const root=await mkdtemp(path.join(os.tmpdir(),'reviewdocs-doctor-'));
 await mkdir(path.join(root,'docs'));
 await writeFile(path.join(root,'docs/README.md'),'# Manual\n');
 const config={collections:[{id:'reference',title:'Manual',sourceDir:'docs',outputDir:'generated/reference',pages:[{file:'README.md'}]}]};
 const filename=path.join(root,'reviewdocs.config.mjs');await writeFile(filename,`export default ${JSON.stringify(config)};`);
 return {root,filename};
}
test('doctor reports missing output as versioned JSON data without writing state',async()=>{
 const {root,filename}=await project(),source=path.join(root,'docs/README.md'),before=(await stat(source)).mtimeMs;
 const report=await doctor(filename);
 assert.equal(report.schemaVersion,1);assert.equal(report.results[0].state,'missing');
 assert.equal((await stat(source)).mtimeMs,before);await assert.rejects(()=>access(path.join(root,'.reviewdocs')),/ENOENT/);
});
test('doctor selection and malformed configuration produce actionable diagnostics',async()=>{
 const {root,filename}=await project();
 assert.equal((await doctor(filename,{only:['unknown']})).results[0].code,'RD_UNKNOWN_ID');
 const broken=path.join(root,'broken.mjs');await writeFile(broken,'export default {');
 const cli=path.resolve('bin/reviewdocs.mjs');
 const result=spawnSync(process.execPath,[cli,'doctor','--json','--config',broken],{encoding:'utf8'});
 assert.equal(result.status,1);const report=JSON.parse(result.stdout);assert.equal(report.results[0].code,'RD_CONFIG_INVALID');assert.ok(report.results[0].message);
});
