#!/usr/bin/env node
import path from "node:path";
import {doctor} from "../src/doctor.mjs";
import {migrateProject} from "../src/migrate.mjs";
import {version} from "../src/provenance.mjs";
import process from "node:process";
import { buildAll, checkAll, initializeProject, adoptProject, verifyAll, executeEvidence } from "../src/index.mjs";
import { loadConfig } from "../src/config.mjs";
import { serveDocs, openBrowser, exportDocs } from "../src/delivery.mjs";

function usage() {
  console.log(`reviewdocs <command> [options]

Commands:
  init [directory]        Create a complete starter tree (refuses conflicts)
  adopt [directory]       Add missing files; preserve existing docs/config
  upgrade [directory]     Upgrade unchanged managed skills; propose conflicts
  build                   Generate configured artifacts; does not run test lanes
  check                   Rebuild, verify determinism, links and structured state
  doctor                  Read-only diagnostics (--json for machine output)
  migrate                 Move checked legacy proof to private state
  verify                  Read-only source/output freshness validation
  evidence                Execute explicitly selected repository evidence lanes
  serve                   Serve the generated portal on loopback
  open                    Serve and open the portal in a browser
  export <directory>      Copy a verified portable portal to a new directory

Options:
  --config <path>          Configuration file (default: reviewdocs.config.mjs)
  --only <id,...>          Select artifact IDs or explicit evidence lane IDs
  --dry-run               Adoption plan without writes
                           Also previews migration: reviewdocs migrate --dry-run
  --json                  Doctor output as versioned machine-readable JSON
  --profile complete      Complete three-category scaffold
  --skills / --no-skills   Include/exclude packaged skills during adoption
  --port <number>          Loopback port; default chooses an available port
  --force                 Init only: replace starter-file conflicts
  --help                  Show this help
`);
}
function parse(argv) {
  const result = { command: argv[0], help:["--help","-h"].includes(argv[0]), version:argv[0]==="--version", config: "reviewdocs.config.mjs", only: [], force: false, skills: true, port: 0 };
  const value = index => { if (!argv[index] || argv[index].startsWith("--")) throw new Error(`missing value for ${argv[index - 1]}`); return argv[index]; };
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (["--help", "-h"].includes(arg)) result.help = true;
    else if (arg === "--json") result.json = true;
    else if (arg === "--version") result.version = true;
    else if (arg === "--force") result.force = true;
    else if (arg === "--dry-run") result.dryRun = true;
    else if (arg === "--skills") result.skills = true;
    else if (arg === "--no-skills") result.skills = false;
    else if (arg === "--profile") result.profile = value(++index);
    else if (arg === "--config") result.config = value(++index);
    else if (arg === "--only") result.only = value(++index).split(",").filter(Boolean);
    else if (arg === "--port") result.port = Number(value(++index));
    else if (!result.directory && ["init", "adopt", "upgrade", "export"].includes(result.command)) result.directory = arg;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(result.port) || result.port < 0 || result.port > 65535) throw new Error("invalid port");
  if (result.force && result.command !== "init") throw new Error("--force is only supported for init; adoption preserves conflicts");
  return result;
}
try {
  const options = parse(process.argv.slice(2));
  const configPath = path.resolve(options.config);
  if (options.version) console.log(version);
  else if (!options.command || options.help) { usage(); process.exitCode = options.command ? 0 : 1; }
  else if (options.command === "init") await initializeProject(path.resolve(options.directory ?? "."), { force: options.force });
  else if (["adopt", "upgrade"].includes(options.command)) await adoptProject(path.resolve(options.directory ?? "."), options);
  else if (options.command === "doctor") {const report=await doctor(configPath,options);console.log(options.json?JSON.stringify(report):report.results.map(r=>`${r.id}: ${r.state}${r.message?` — ${r.message}`:""}\n  ${r.command??"Correct the configuration"}`).join("\n"));if(report.status!=="fresh")process.exitCode=1;}
  else if (options.command === "migrate") console.log(JSON.stringify(await migrateProject(configPath,options),null,2));
  else if (options.command === "build") await buildAll(configPath, options);
  else if (options.command === "check") await checkAll(configPath, options);
  else if (options.command === "verify") await verifyAll(configPath, options);
  else if (options.command === "evidence") { const results = await executeEvidence(configPath, options); if (results.some(r => r.status !== "passed")) process.exitCode = 1; }
  else if (options.command === "export") {
    if (!options.directory) throw new Error("export requires a destination directory");
    await verifyAll(configPath);
    const config = await loadConfig(configPath);
    await exportDocs(config, path.resolve(options.directory));
  } else if (["serve", "open"].includes(options.command)) {
    const config = await loadConfig(configPath);
    if (!config.landing) throw new Error("serve/open requires landing configuration; build first");
    const { server, url } = await serveDocs(config.landing.outputDir, options);
    console.log(`Documentation: ${url}\nServing generated files only. Ctrl+C stops the server.`);
    if (options.command === "open") openBrowser(url);
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => process.exit(0)));
  } else throw new Error(`unknown command: ${options.command}`);
} catch (error) { console.error(`reviewdocs: ${error.message}`); process.exitCode = 1; }
