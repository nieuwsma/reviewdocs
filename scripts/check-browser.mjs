import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildAll, checkAll } from "../src/index.mjs";
import { replaceDirectory } from "../src/files.mjs";
import { serveDocs } from "../src/delivery.mjs";
import { inputDigest, hash, sourceState } from "../src/provenance.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const example = path.join(root, "example");
const config = path.join(example, "reviewdocs.config.mjs");
const capture = process.argv.includes("--capture");
if (capture) await buildAll(config); else await checkAll(config);
const sourceInputHash = await inputDigest(example, ["docs/user/assets/demo"]);
let browser, server, staging;
try {
  browser = await chromium.launch({ headless: true });
  const served = await serveDocs(path.join(example, "docs/generated"));
  server = served.server;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => route.request().url().startsWith(served.url) ? route.continue() : route.abort());
  await page.goto(`${served.url}user/index.html`);
  await page.locator("[data-nav-filter]").fill("troubleshooting");
  assert.equal(await page.locator("[data-nav-item]:visible").count(), 1);
  await page.locator("[data-nav-filter]").fill("");
  await page.goto(`${served.url}user/review-and-approve.html`);
  const term = page.locator(".term").first();
  await term.focus();
  assert.equal(await term.evaluate(element => element === document.activeElement), true);
  await term.click();
  assert.match(page.url(), /glossary\.html#revision/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".sidebar").isVisible(), false);
  await page.emulateMedia({ media: "screen" });
  const missing = await page.goto(`${served.url}help/does-not-exist`);
  assert.equal(missing.status(), 404);
  await page.goto(`${served.url}help/index.html`);
  assert.equal(await page.locator('a[href*="maintenance"]').count(), 0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${served.url}user/assets/demo/index.html`);
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByLabel("Draft text").fill("Review the draft");
  await page.getByRole("button", { name: "Save revision", exact: true }).click();
  assert.match(await page.locator("#status").textContent(), /Version 1.*Pending approval/);
  await page.getByRole("button", { name: "Approve current", exact: true }).click();
  assert.equal(await page.locator("#status").textContent(), "Approved version 1");
  const shots = [];
  const assets = path.join(example, "docs/user/assets/screenshots");
  if (capture) {
    await mkdir(path.join(root, ".local"), { recursive: true });
    staging = await mkdtemp(path.join(root, ".local/captures-"));
  }
  async function screenshot(file, alt) {
    await page.screenshot({ path: path.join(staging, file), animations: "disabled", fullPage: true });
    shots.push({ file, chapter: "docs/user/screenshots.md", alt, sha256: hash(await readFile(path.join(staging, file))) });
  }
  if (capture) await screenshot("approved.png", "Saved note showing explicit approval of version one");
  await page.getByLabel("Draft text").fill("Review the draft with the editor");
  assert.equal(await page.getByRole("button", { name: "Approve current", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "Save revision", exact: true }).click();
  assert.match(await page.locator("#status").textContent(), /Version 2.*Pending approval/);
  if (capture) {
    await screenshot("revised.png", "Edited note showing version two pending a new approval");
    assert.deepEqual(errors, []);
    assert.equal(sourceInputHash, await inputDigest(example, ["docs/user/assets/demo"]), "capture inputs changed; previous assets retained");
    const manifest = { formatVersion: 1, source: { ...sourceState(root), inputHash: sourceInputHash }, mode: "Actual synthetic Note Desk browser UI; no backend/authentication/deployment proof.", viewport: { width: 1440, height: 1000 }, screenshots: shots };
    await writeFile(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await replaceDirectory(assets, stage => cp(staging, stage, { recursive: true }));
    await writeFile(path.join(example, "docs/user/screenshots.md"), `# Illustrated demo\n\nActual synthetic browser interface; not production workflow acceptance.\n\n${shots.map(s => `![${s.alt}](assets/screenshots/${s.file})`).join("\n\n")}\n`);
  }
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: navigation, glossary keyboard access, narrow layout, print, finite help, demo save/approve/invalidation.");
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (staging) await rm(staging, { recursive: true, force: true });
}
if (capture) await checkAll(config);
