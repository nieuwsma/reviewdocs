import { copyPresentation } from "./presentation.mjs";
import { javascript } from "./ui.mjs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { replaceDirectory } from "./files.mjs";
import { escapeHtml as esc, safePath } from "./paths.mjs";

export const findingStates = ["open", "fixed", "partially fixed", "unchanged", "superseded", "accepted", "unable to verify"];
export const severities = ["critical", "high", "medium", "low", "observation"];
export async function readCampaign(configuration) {
  const campaign = JSON.parse(await readFile(configuration.source, "utf8"));
  const previous = configuration.previous ? JSON.parse(await readFile(configuration.previous, "utf8")) : undefined;
  validateCampaign(campaign, previous);
  for (const track of campaign.tracks) {
    if (!track.report) {
      if (configuration.strictNarrative) throw new Error(`${track.id}: configure an authored track report`);
      continue;
    }
    const report = await readFile(safePath(path.dirname(configuration.source), track.report), "utf8");
    for (const finding of campaign.findings.filter(f => f.track === track.id)) {
      const escaped = finding.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`(?:^|[^A-Za-z0-9._-])${escaped}(?:$|[^A-Za-z0-9._-])`).test(report)) throw new Error(`${finding.id}: missing authored analysis in ${track.report}`);
    }
  }
  return campaign;
}
export function validateCampaign(campaign, previous) {
  if (campaign.formatVersion !== 1 || !campaign.id || !campaign.source?.description || !Array.isArray(campaign.findings) || !Array.isArray(campaign.evidence) || !Array.isArray(campaign.tracks)) throw new Error("campaign needs formatVersion, id, source.description, tracks, evidence and findings");
  const unique = (items, label) => {
    const ids = new Set();
    for (const item of items) { if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(item.id) || ids.has(item.id)) throw new Error(`${label}: duplicate/invalid id ${item.id}`); ids.add(item.id); }
    return ids;
  };
  const tracks = unique(campaign.tracks, "tracks"), evidence = unique(campaign.evidence, "evidence");
  unique(campaign.findings, "findings");
  for (const item of campaign.evidence) {
    if (!["passed", "failed", "partial", "unavailable", "not run"].includes(item.status) || !["source read", "mocked", "integration", "canary", "deployment", "manual"].includes(item.proof) || !item.description) throw new Error(`${item.id}: evidence needs status, proof and description`);
    if (["passed", "failed", "partial"].includes(item.status) && !item.path) throw new Error(`${item.id}: executed/read evidence needs retained path`);
  }
  for (const finding of campaign.findings) {
    if (!finding.title || !tracks.has(finding.track) || !finding.exitCondition || !finding.history?.length) throw new Error(`${finding.id}: incomplete finding`);
    let date = "";
    for (const event of finding.history) {
      if (!findingStates.includes(event.status) || !severities.includes(event.severity) || !["high", "medium", "low"].includes(event.confidence) || !event.reason || !/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(event.date) || !Number.isFinite(Date.parse(event.date)) || event.date < date || !Array.isArray(event.evidence)) throw new Error(`${finding.id}: invalid disposition history`);
      date = event.date;
      for (const id of event.evidence) if (!evidence.has(id)) throw new Error(`${finding.id}: missing evidence ${id}`);
      if (event.status === "fixed" && !event.evidence.some(id => campaign.evidence.find(e => e.id === id)?.status === "passed")) throw new Error(`${finding.id}: fixed needs passing evidence with its proof boundary`);
    }
  }
  if (previous) for (const old of previous.findings) {
    const current = campaign.findings.find(f => f.id === old.id);
    if (!current) throw new Error(`dropped canonical finding ${old.id}`);
    if (JSON.stringify(current.history.slice(0, old.history.length)) !== JSON.stringify(old.history)) throw new Error(`${old.id}: prior disposition history was rewritten`);
    if (current.history.length <= old.history.length) throw new Error(`${old.id}: reassessment requires a new explicit disposition`);
    for (const alias of old.aliases ?? []) if (!current.aliases?.includes(alias)) throw new Error(`${old.id}: dropped source alias ${alias}`);
  }
  if (previous) for (const old of previous.evidence) {
    const current = campaign.evidence.find(e => e.id === old.id);
    if (JSON.stringify(current) !== JSON.stringify(old)) throw new Error(`${old.id}: prior evidence was dropped or rewritten; append a new evidence id`);
  }
}
export function renderCampaign(campaign, section, { evidenceHref = () => undefined } = {}) {
  if (section === "review-summary") {
    const counts = {};
    for (const f of campaign.findings) { const event = f.history.at(-1); counts[event.status] = (counts[event.status] ?? 0) + 1; }
    return `<p>Campaign <strong>${esc(campaign.id)}</strong>: ${campaign.findings.length} canonical findings. Source: ${esc(campaign.source.description)}.</p><ul>${Object.entries(counts).map(([status, n]) => `<li>${esc(status)}: ${n}</li>`).join("")}</ul><p>Evidence: ${campaign.evidence.map(e => { const href = evidenceHref(e); return `${href ? `<a href="${esc(href)}">${esc(e.id)}</a>` : esc(e.id)} (${esc(e.status)}, ${esc(e.proof)})`; }).join("; ") || "none recorded"}. No release judgment is inferred by the generator.</p>`;
  }
  if (section === "review-findings") return `<table><thead><tr><th>ID</th><th>Finding</th><th>Status / severity / confidence</th><th>Track</th><th>Exit condition</th></tr></thead><tbody>${campaign.findings.map(f => { const e = f.history.at(-1); return `<tr id="${esc(f.id.toLowerCase())}"><td>${esc(f.id)}</td><td>${esc(f.title)}</td><td>${esc(e.status)} / ${esc(e.severity)} / ${esc(e.confidence)}</td><td>${esc(f.track)}</td><td>${esc(f.exitCondition)}</td></tr>`; }).join("")}</tbody></table>`;
  if (section === "review-history") return campaign.findings.map(f => `<h2>${esc(f.id)} history</h2><ul>${f.history.map(e => `<li>${esc(e.date)}: ${esc(e.status)} — ${esc(e.reason)}. Evidence: ${e.evidence.map(esc).join(", ") || "none"}.</li>`).join("")}</ul>`).join("");
  throw new Error(`unknown campaign section ${section}`);
}
export const evidenceOutput = evidence => `evidence/${evidence.id}/${path.basename(evidence.path)}`;
export async function buildCampaign(configuration, campaign, root, presentation) {
  await replaceDirectory(configuration.outputDir, async stage => {
    let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Campaign ${esc(campaign.id)}</title></head><body><h1>Engineering campaign</h1>${renderCampaign(campaign, "review-summary")}${renderCampaign(campaign, "review-findings")}${renderCampaign(campaign, "review-history")}</body></html>\n`;
    if (presentation) {
      html = await presentation.renderPage({ title: configuration.title ?? 'Engineering Campaign', label: campaign.id, homeHref: 'index.html', options: presentation.options, body: `<h1>Engineering campaign</h1>${renderCampaign(campaign, "review-summary")}${renderCampaign(campaign, "review-findings")}${renderCampaign(campaign, "review-history")}` });
      await copyPresentation(presentation, stage);
      await writeFile(`${stage}/site.js`, javascript);
    }
    await writeFile(`${stage}/index.html`, html);
  });
}
