import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildAll, checkAll, verifyAll } from '../src/index.mjs';
import { validateSite } from '../src/check.mjs';
test('presentation travels with nested help and portal and participates in freshness checks', async () => {
 const root=await mkdtemp(path.join(os.tmpdir(),'reviewdocs-presentation-'));
 try {
  await mkdir(path.join(root,'source/sub'),{recursive:true});await mkdir(path.join(root,'theme/assets'),{recursive:true});
  await writeFile(path.join(root,'source/README.md'),'# Start\n\n[Next](sub/next.md)');await writeFile(path.join(root,'source/sub/next.md'),'# Next\n\n[Start](../README.md)');
  await writeFile(path.join(root,'theme/assets/theme.css'),'body{}');await writeFile(path.join(root,'theme/assets/theme.js'),'// local asset');
  await writeFile(path.join(root,'theme/server.mjs'), `export function renderPage(p){return '<html><head><link rel="stylesheet" href="'+(p.assetPrefix??'')+'_presentation/theme.css"></head><body><main id="content">'+p.body+'</main><script src="'+(p.assetPrefix??'')+'_presentation/theme.js"></script></body></html>';}`);
  const config=path.join(root,'reviewdocs.config.mjs');await writeFile(config,`export default {portable:true,presentation:{module:'theme/server.mjs',assets:'theme/assets'},landing:{title:'Docs',outputDir:'out'},collections:[{id:'help',title:'Help',sourceDir:'source',outputDir:'out/help',bundled:true,pages:[{file:'README.md',output:'index.html'},{file:'sub/next.md'}]}],provenance:{required:true}};`);
  await checkAll(config);assert.match(await readFile(path.join(root,'out/help/sub/next.html'),'utf8'),/\.\.\/_presentation\/theme.css/);await verifyAll(config);
  const relocated=path.join(root,'relocated');await cp(path.join(root,'out'),relocated,{recursive:true});assert.equal(await validateSite(relocated,{portable:true,root:relocated}),3);
  await writeFile(path.join(root,'theme/assets/theme.css'),'body{color:red}');await assert.rejects(verifyAll(config),/stale inputs/);await buildAll(config);
  assert.match(await readFile(path.join(root,'out/help/index.html'),'utf8'),/_presentation\/theme.css/);
  await writeFile(path.join(root,'out/_presentation/theme.css'),'tampered');await assert.rejects(verifyAll(config),/changed or is incomplete/);
  await writeFile(config,(await readFile(config,'utf8')).replace("file:'sub/next.md'","file:'sub/next.md',output:'_presentation/next.html'"));await assert.rejects(buildAll(config),/reserved presentation output/);
 } finally {await rm(root,{recursive:true,force:true});}
});
