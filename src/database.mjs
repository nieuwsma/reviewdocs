import { chmod, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { replaceDirectory } from "./files.mjs";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit", cwd: options.cwd, env: options.env });
    let output = "";
    if (options.capture) child.stdout.on("data", chunk => { output += chunk; });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`)));
  });
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function substitute(value, variables) {
  return value.replace(/\$\{([A-Z_]+)\}/g, (_, name) => {
    if (!(name in variables)) throw new Error(`unknown database documentation variable: ${name}`);
    return variables[name];
  });
}

export async function buildDatabaseDocs(configuration, root) {
  const postgresImage = configuration.postgresImage ?? "postgres:16";
  const schemaSpyImage = configuration.schemaSpyImage ?? "schemaspy/schemaspy:7.0.2";
  const port = String(configuration.port ?? 55439);
  const password = `reviewdocs-${process.pid}`;
  const container = `reviewdocs-postgres-${process.pid}`;
  await mkdir(configuration.temporaryRoot, { recursive: true });
  const stage = await mkdtemp(path.join(configuration.temporaryRoot, "reviewdocs-db-"));
  await chmod(stage, 0o755);
  let started = false;
  try {
    await run("docker", ["image", "inspect", postgresImage], { capture: true });
    await run("docker", ["image", "inspect", schemaSpyImage], { capture: true });
    await run("docker", ["run", "--detach", "--name", container, "--publish", `127.0.0.1:${port}:5432`, "--env", `POSTGRES_PASSWORD=${password}`, "--env", "POSTGRES_DB=postgres", postgresImage], { capture: true });
    started = true;
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      try { await run("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "postgres"], { capture: true }); break; }
      catch (error) { if (attempt === 30) throw error; await wait(1000); }
    }
    for (const database of configuration.databases ?? []) {
      const dbName = database.database ?? `${database.id}_docs`;
      await run("docker", ["exec", container, "createdb", "-U", "postgres", dbName]);
      const variables = {
        DATABASE_CONTAINER: container,
        DATABASE_NAME: dbName,
        DATABASE_HOST: "127.0.0.1",
        DATABASE_PORT: port,
        DATABASE_USER: "postgres",
        DATABASE_PASSWORD: password,
        DATABASE_URL: `postgres://postgres:${password}@127.0.0.1:${port}/${dbName}?sslmode=disable`,
      };
      const migration = database.migrate;
      if (!migration?.command?.length) throw new Error(`database ${database.id} requires migrate.command`);
      const environment = { ...process.env, ...Object.fromEntries(Object.entries(migration.env ?? {}).map(([key, value]) => [key, substitute(value, variables)])) };
      await run(migration.command[0], migration.command.slice(1).map(value => substitute(value, variables)), { cwd: root, env: environment });
      const output = path.join(stage, database.id);
      await mkdir(output, { recursive: true });
      await chmod(output, 0o777);
      await run("docker", ["run", "--rm", "--user", "0:0", "--add-host", "host.docker.internal:host-gateway", "--volume", `${output}:/output`, schemaSpyImage, "-t", "pgsql11", "-host", "host.docker.internal", "-port", port, "-db", dbName, "-s", database.schema ?? "public", "-u", "postgres", "-p", password]);
      const schema = await run("docker", ["exec", container, "pg_dump", "-U", "postgres", "-d", dbName, "--schema-only", "--no-owner", "--no-privileges"], { capture: true });
      await writeFile(path.join(output, "schema.sql"), schema.replace(/^\\(?:un)?restrict .*$/gm, "").trimStart());
    }
    await replaceDirectory(configuration.outputDir, async output => {
      for (const database of configuration.databases ?? []) {
        const source = path.join(stage, database.id);
        await cp(source, path.join(output, database.id), { recursive: true });
      }
    });
    console.log(`built ${configuration.id ?? "database"}: ${configuration.outputDir}`);
  } finally {
    if (started) await run("docker", ["rm", "-f", container], { capture: true }).catch(() => {});
    await rm(stage, { recursive: true, force: true });
  }
}
