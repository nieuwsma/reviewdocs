import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {buildAll,verifyAll} from '../src/index.mjs';
test('embedded inventory builds its producer and becomes stale when source/dependency changes', async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'reviewdocs-report-'));
 try{
 await mkdir(path.join(root,'src'));await mkdir(path.join(root,'docs'));
 await writeFile(path.join(root,'src/main.go'),'package main\n');
 await writeFile(path.join(root,'docs/README.md'),'# Codebase\n\n{{inventory-report}}\n');
 const config=path.join(root,'reviewdocs.config.mjs');
 await writeFile(config,`export default {inventory:{id:'inventory',root:'.',include:['src'],extensions:['.go'],output:'out/inventory.json'},collections:[{id:'reference',title:'Reference',sourceDir:'docs',outputDir:'out/reference',pages:[{file:'README.md',output:'index.html'}]}],provenance:{required:true}};`);
 await buildAll(config,{only:['reference']});await verifyAll(config,{only:['reference']});
 assert.match(await readFile(path.join(root,'out/reference/index.html'),'utf8'),/Go \(.go\)/);
 await writeFile(path.join(root,'src/main.go'),'package main\n// newly measured line\n');
 await assert.rejects(verifyAll(config,{only:['reference']}),/stale inputs/);
 await buildAll(config,{only:['inventory']});
 await assert.rejects(verifyAll(config,{only:['reference']}),/stale dependency/);
 await buildAll(config,{only:['reference']});await verifyAll(config,{only:['reference']});
 await writeFile(config,(await readFile(config,'utf8')).replace("id:'inventory',root", "id:'inventory',dependsOn:['reference'],root"));
 await assert.rejects(buildAll(config),/dependency cycle/);
 }finally{await rm(root,{recursive:true,force:true});}
});
