import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildCollection } from '../src/site.mjs';
import { validateSite } from '../src/check.mjs';
import { assertDocumentationLink } from '../src/publication.mjs';

async function fixture(markdown) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'reviewdocs-publication-'));
  const sourceDir = path.join(root, 'source'), outputDir = path.join(root, 'output');
  await mkdir(path.join(sourceDir, 'assets'), { recursive: true });
  await writeFile(path.join(sourceDir, 'README.md'), markdown);
  return { id: 'safe', title: 'Safe docs', sourceDir, outputDir, assets: ['assets'], pages: [{ file: 'README.md', output: 'index.html' }] };
}

test('unlinked source and archives cannot be copied as assets', async () => {
  for (const name of ['server.go', 'client.py', 'schema.sql', 'ui.tsx', 'source.zip', 'evidence.json']) {
    const collection = await fixture('# Documentation\n');
    await writeFile(path.join(collection.sourceDir, 'assets', name), 'private implementation');
    await assert.rejects(() => buildCollection(collection), /refusing non-illustration publication/);
  }
});

test('code links are rejected before replacing published documentation', async () => {
  const collection = await fixture('# Documentation\n\n[Implementation](../server.go)');
  await assert.rejects(() => buildCollection(collection), /non-document link/);
  const raw = await fixture('# Documentation\n\n<a href=../server.go>Implementation</a>');
  await assert.rejects(() => buildCollection(raw), /non-document link/);
  assert.throws(() => assertDocumentationLink('https://github.com/company/app/blob/main/server.go'), /non-document link/);
  assert.throws(() => assertDocumentationLink('assets/%73erver.go?download=1'), /non-document link/);
});

test('screenshots stay inline, and old source assets disappear on successful rebuild', async () => {
  const collection = await fixture('# Documentation\n\n![Worker form](assets/form.png)\n');
  collection.screenshots = true;
  await writeFile(path.join(collection.sourceDir, 'assets', 'form.png'), 'illustration fixture');
  await mkdir(path.join(collection.outputDir, 'assets'), { recursive: true });
  await writeFile(path.join(collection.outputDir, 'assets', 'old.go'), 'old implementation');
  await buildCollection(collection);
  assert.deepEqual(await readdir(path.join(collection.outputDir, 'assets')), ['form.png']);
  assert.equal(await validateSite(collection.outputDir), 1);
});

test('checking existing output catches hidden source and non-doc anchor downloads', async () => {
  const collection = await fixture('# Documentation');
  await mkdir(collection.outputDir);
  await writeFile(path.join(collection.outputDir, 'index.html'), '<a href=evidence.json>Download</a>');
  await writeFile(path.join(collection.outputDir, 'evidence.json'), '{}');
  await assert.rejects(() => validateSite(collection.outputDir), /non-document link/);
  await writeFile(path.join(collection.outputDir, 'hidden.py'), 'private');
  await assert.rejects(() => validateSite(collection.outputDir), /published source file/);
});
