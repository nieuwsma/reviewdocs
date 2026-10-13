import { StringDecoder } from "node:string_decoder";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { inputDigest, sourceState, version, hash } from "./provenance.mjs";
import { safePath } from "./paths.mjs";
import { exists } from "./files.mjs";

export function redact(text) {
  return text.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, "[REDACTED PRIVATE KEY]")
    .replace(/(Bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/([a-z]+:\/\/[^\s:/]+:)[^\s@]+@/gi, "$1[REDACTED]@")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/([?&](?:X-Amz-[^=&\s]+|access_token|code)=)[^&\s]+/gi, "$1[REDACTED]");
}
async function execute(command, cwd, timeout, substitutions, maxLogBytes) {
  if (!Array.isArray(command) || !command.length || command.some(arg => typeof arg !== "string")) throw new Error("evidence command must be an argument array");
  const expanded = command.map(arg => arg.replaceAll("${RUN_DIR}", substitutions.runDir));
  return await new Promise(resolve => {
    const detached = process.platform !== "win32";
    const child = spawn(expanded[0], expanded.slice(1), { cwd, detached, env: { ...process.env, REVIEWDOCS_RUN_DIR: substitutions.runDir }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, logTruncated = false, retainedBytes = 0;
    const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') };
    const capture = (stream, chunk) => {
      const remaining = Math.max(0, maxLogBytes - retainedBytes);
      const retained = chunk.subarray(0, remaining);
      retainedBytes += retained.length;
      logTruncated ||= retained.length < chunk.length;
      const text = decoders[stream].write(retained);
      if (stream === 'stdout') stdout += text; else stderr += text;
    };
    child.stdout?.on("data", chunk => capture('stdout', chunk));
    child.stderr?.on("data", chunk => capture('stderr', chunk));
    const stop = signal => { try { if (detached && child.pid) process.kill(-child.pid, signal); else child.kill(signal); } catch { /* child already exited */ } };
    const timer = setTimeout(() => { timedOut = true; stop("SIGTERM"); }, timeout);
    const killTimer = setTimeout(() => stop("SIGKILL"), timeout + 2000);
    child.on("error", error => { clearTimeout(timer); clearTimeout(killTimer); resolve({ exitCode: null, error: error.message, stdout: stdout + decoders.stdout.end(), stderr: stderr + decoders.stderr.end(), timedOut, logTruncated }); });
    child.on("close", code => { clearTimeout(timer); clearTimeout(killTimer); resolve({ exitCode: code, stdout: stdout + decoders.stdout.end(), stderr: stderr + decoders.stderr.end(), timedOut, logTruncated }); });
  });
}
export async function runEvidence(config, lane) {
  const runDir = path.join(lane.outputDir, `run-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`);
  await mkdir(runDir, { recursive: true });
  const started = Date.now();
  const record = { formatVersion: 1, id: lane.id, toolkitVersion: version, producer: redact(JSON.stringify(lane.command)), source: sourceState(config.root), inputHash: await inputDigest(config.root, lane.inputs, { exclude: lane.inputExclude }), startedAt: new Date(started).toISOString(), proof: lane.proof, status: "unavailable", outputs: [], outputHashes: {} };
  try {
    for (const prerequisite of lane.requires ?? []) if (!await exists(safePath(config.root, prerequisite))) throw new Error(`missing prerequisite: ${prerequisite}`);
    const result = await execute(lane.command, lane.cwd, lane.timeoutMs ?? 300000, { runDir }, lane.maxLogBytes ?? 1048576);
    Object.assign(record, { exitCode: result.exitCode, timedOut: result.timedOut, logTruncated: result.logTruncated, status: result.error ? "unavailable" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed", error: result.error ?? (result.timedOut ? "command timed out" : undefined) });
    await writeFile(path.join(runDir, "command.log"), redact(`${result.stdout}\n${result.stderr}`) + (result.logTruncated ? "\n[LOG TRUNCATED]\n" : ""));
    for (const output of new Set(["command.log", ...(lane.outputs ?? []), ...(lane.resultFile ? [lane.resultFile] : [])])) {
      const filename = safePath(runDir, output);
      if (!await exists(filename)) { record.status = record.status === "passed" ? "partial" : record.status; continue; }
      record.outputs.push(output);
      record.outputHashes[output] = hash(await readFile(filename));
    }
    if (lane.resultFile && await exists(safePath(runDir, lane.resultFile))) {
      const result = JSON.parse(await readFile(safePath(runDir, lane.resultFile), "utf8"));
      record.result = Object.fromEntries(["tests", "passed", "failed", "skipped"].filter(key => key in result).map(key => [key, result[key]]));
      for (const key of ["tests", "passed", "failed", "skipped"]) if (record.result[key] !== undefined && (!Number.isInteger(record.result[key]) || record.result[key] < 0)) throw new Error(`invalid result count: ${key}`);
      if (record.result.failed > 0) record.status = "failed";
      else if (lane.requireNoSkips && (record.result.skipped > 0 || record.result.skipped === undefined)) record.status = record.status === "passed" ? "partial" : record.status;
      if (["tests", "passed", "failed", "skipped"].every(key => record.result[key] !== undefined) && record.result.tests !== record.result.passed + record.result.failed + record.result.skipped) record.status = record.status === "passed" ? "partial" : record.status;
    } else if (lane.requireNoSkips) record.status = record.status === "passed" ? "partial" : record.status;
    if (record.inputHash !== await inputDigest(config.root, lane.inputs, { exclude: lane.inputExclude })) { record.status = record.status === "passed" ? "partial" : record.status; record.error = "production inputs changed during execution"; }
  } catch (error) { record.error = redact(error.message); if (record.status === "passed") record.status = "partial"; }
  if(record.status === "passed") { try { assertEvidenceRecord(record,lane); } catch(error) { record.status="partial"; record.error=error.message; } }
  record.durationMs = Date.now() - started;
  await writeFile(path.join(runDir, "run.json"), `${JSON.stringify(record, null, 2)}\n`);
  const runs = [];
  for (const entry of await readdir(lane.outputDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("run-")) continue;
    const filename = path.join(lane.outputDir, entry.name, "run.json");
    if (!await exists(filename)) continue;
    const past = JSON.parse(await readFile(filename, "utf8"));
    runs.push({ run: entry.name, status: past.status, startedAt: past.startedAt, durationMs: past.durationMs, proof: past.proof, inputHash: past.inputHash });
  }
  const atomicJson = async (filename, value) => {
    const temporary = `${filename}.${randomUUID()}.staging`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporary, filename);
  };
  await atomicJson(path.join(lane.outputDir, "index.json"), runs.sort((a, b) => a.run.localeCompare(b.run)));
  if (record.status === "passed") {
    const pointer = path.join(lane.outputDir, "latest.json");
    await atomicJson(pointer, { run: path.basename(runDir), inputHash: record.inputHash });
  }
  console.log(`evidence ${lane.id}: ${record.status}; retained ${runDir}`);
  return record;
}
export async function verifyEvidence(config, lane) {
  const pointer = JSON.parse(await readFile(path.join(lane.outputDir, "latest.json"), "utf8"));
  const record = JSON.parse(await readFile(safePath(lane.outputDir, `${pointer.run}/run.json`), "utf8"));
  assertEvidenceRecord(record, lane);
  if (record.status !== "passed" || record.inputHash !== await inputDigest(config.root, lane.inputs, { exclude: lane.inputExclude })) throw new Error(`${lane.id}: stale or nonpassing evidence; run explicitly`);
  for (const output of record.outputs) {
    const filename = safePath(path.join(lane.outputDir, pointer.run), output);
    if (!await exists(filename) || record.outputHashes?.[output] !== hash(await readFile(filename))) throw new Error(`${lane.id}: missing or changed retained output ${output}`);
  }
}

// Validate policy again when reading retained proof; a forged/misclassified
// passing label must not bypass the actual completion conditions.
export function assertEvidenceRecord(record, lane) {
  if (record.formatVersion !== 1 || record.id !== lane.id || record.proof !== lane.proof || record.status !== 'passed' || record.timedOut || record.exitCode !== 0) throw new Error(`${lane.id}: nonpassing or incompatible evidence`);
  const required = [...new Set([...(lane.outputs ?? []), ...(lane.resultFile ? [lane.resultFile] : [])])];
  if (!Array.isArray(record.outputs) || required.some(name => !record.outputs.includes(name) || !record.outputHashes?.[name])) throw new Error(`${lane.id}: incomplete retained evidence outputs`);
  if (lane.resultFile) {
    const result = record.result;
    if (!result || Object.values(result).some(value => !Number.isInteger(value) || value < 0) || result.failed > 0) throw new Error(`${lane.id}: invalid or failed retained counts`);
    if (lane.requireNoSkips && (!['tests','passed','failed','skipped'].every(key => Number.isInteger(result[key])) || result.skipped !== 0)) throw new Error(`${lane.id}: incomplete or skipped retained counts`);
    if (['tests','passed','failed','skipped'].every(key => result[key] !== undefined) && result.tests !== result.passed + result.failed + result.skipped) throw new Error(`${lane.id}: inconsistent retained counts`);
  }
}
