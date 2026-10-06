import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,chmod} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('CLI dispatches schema producer and preserves old schema when Docker is unavailable',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'reviewdocs-database-'));
 await mkdir(path.join(root,'fake-bin'));await mkdir(path.join(root,'migrations'));await mkdir(path.join(root,'generated/database'),{recursive:true});
 await writeFile(path.join(root,'migrations/001.sql'),'CREATE TABLE fixture(id integer);');
 await writeFile(path.join(root,'producer.mjs'),'// fixture producer');
 await writeFile(path.join(root,'generated/database/prior.txt'),'last valid proof');
 await writeFile(path.join(root,'fake-bin/docker'),'#!/bin/sh\nprintf "%s\\n" "$*" > docker-attempt.txt\nexit 11\n');await chmod(path.join(root,'fake-bin/docker'),0o755);
 await writeFile(path.join(root,'reviewdocs.config.mjs'),`export default ${JSON.stringify({databaseDocs:{outputDir:'generated/database',temporaryRoot:'.local',inputs:['migrations','producer.mjs'],databases:[{id:'fixture',migrate:{command:['node','producer.mjs']}}]}})};`);
 const cli=fileURLToPath(new URL('../bin/reviewdocs.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[cli,'build'],{cwd:root,env:{...process.env,PATH:path.join(root,'fake-bin')+path.delimiter+process.env.PATH},encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/docker image inspect postgres:16 exited with 11/);
 assert.equal((await readFile(path.join(root,'docker-attempt.txt'),'utf8')).trim(),'image inspect postgres:16');
 assert.equal(await readFile(path.join(root,'generated/database/prior.txt'),'utf8'),'last valid proof');
});
