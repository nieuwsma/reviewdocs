#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { buildAll, checkAll, initializeProject } from "../src/index.mjs";

function usage() {
  console.log(`reviewdocs <command> [options]

Commands:
  init [directory]       Create a starter configuration and documentation tree
  build                  Generate every configured artifact
  check                  Rebuild, verify determinism, and validate local links

Options:
  --config <path>        Configuration file (default: reviewdocs.config.mjs)
  --only <id,...>        Limit build/check to named collection or artifact IDs
  --force                Allow init to replace conflicting starter files
  --help                 Show this help
`);
}

function parse(argv) {
  const result = { command: argv[0], directory: undefined, config: "reviewdocs.config.mjs", only: [], force: false };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") result.help = true;
    else if (argument === "--force") result.force = true;
    else if (argument === "--config") result.config = argv[++index];
    else if (argument === "--only") result.only = argv[++index].split(",").filter(Boolean);
    else if (!result.directory && result.command === "init") result.directory = argument;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return result;
}

try {
  const options = parse(process.argv.slice(2));
  if (!options.command || options.help) {
    usage();
    process.exitCode = options.command ? 0 : 1;
  } else if (options.command === "init") {
    await initializeProject(path.resolve(options.directory ?? "."), { force: options.force });
  } else if (options.command === "build") {
    await buildAll(path.resolve(options.config), { only: options.only });
  } else if (options.command === "check") {
    await checkAll(path.resolve(options.config), { only: options.only });
  } else {
    throw new Error(`unknown command: ${options.command}`);
  }
} catch (error) {
  console.error(`reviewdocs: ${error.message}`);
  process.exitCode = 1;
}
