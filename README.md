# reviewdocs

`reviewdocs` builds durable system references and evidence-backed engineering review sites from repository-owned sources. It keeps descriptive documentation, evaluative findings, and generated machine evidence connected without treating generated HTML as the source of truth.

The toolkit is product, organization, language, and infrastructure neutral. Generated sites are static and work from `file://` URLs.

## What it provides

- Configuration-driven Markdown collections with navigation and print styles
- Deterministic generation and local link/fragment validation
- Offline Swagger UI from an OpenAPI 3 contract
- Mermaid-to-SVG diagram rendering
- Reproducible first-party source inventory
- SchemaSpy dictionaries, ERDs, and schema-only dumps from disposable PostgreSQL databases
- Starter templates for a System Reference, findings register, executive summary, and incremental review protocol
- An optional repository-local agent skill and evidence-matrix template for repeatable reassessments
- CI and packaging examples

It deliberately does not write review conclusions. Humans or review agents gather evidence, inspect the implementation, and maintain the Markdown findings. The tool makes that durable state reproducible and checkable.

## Requirements

- Node.js 20 or newer
- Docker only when database documentation is configured
- `@mermaid-js/mermaid-cli` only when Mermaid diagram groups are configured
- Application-specific migration commands for database documentation

## Install

During local package development:

```sh
npm install
npm link
```

In another repository after publication:

```sh
npm install --save-dev reviewdocs
npx reviewdocs init
```

`init` can add files to an established repository. It refuses to replace a starter-file path that already exists unless `--force` is supplied.

## Commands

```sh
# Generate every artifact in reviewdocs.config.mjs
npx reviewdocs build

# Rebuild, verify deterministic output, and validate links and anchors
npx reviewdocs check

# Build selected artifact IDs
npx reviewdocs build --only reference,api

# Use a configuration in another location
npx reviewdocs check --config config/documentation.mjs
```

The package repository uses the same interface:

```sh
make test
make example
make check
```

## Configuration

Create `reviewdocs.config.mjs` in the consuming repository:

```js
export default {
  collections: [
    {
      id: "reference",
      title: "System Reference",
      subtitle: "Current behavior and architecture",
      sourceDir: "docs/reference",
      outputDir: "docs/generated/reference",
      pages: [
        { file: "README.md", output: "index.html", label: "Start here" },
        { file: "architecture.md", label: "Architecture" }
      ],
      assets: ["assets"],
      artifacts: [
        { label: "Engineering review", href: "../review/index.html" }
      ],
      rewrites: {
        "../review/README.md": "../review/index.html"
      }
    }
  ],
  diagrams: [
    {
      id: "architecture-diagrams",
      sourceDir: "docs/diagrams",
      outputDir: "docs/generated/diagrams"
    }
  ],
  openapi: [
    {
      id: "public-api",
      title: "Public API",
      source: "api/openapi.json",
      outputDir: "docs/generated/api"
    }
  ],
  inventory: {
    id: "inventory",
    root: ".",
    output: "docs/generated/inventory.json",
    exclude: [".git/", "node_modules/", "vendor/", "docs/generated/"]
  }
};
```

Paths are resolved relative to the configuration file. Artifact IDs are used by `--only`.

### Database documentation

Database documentation is optional. Each database is created empty and migrated through a command supplied by the consuming repository.

```js
export default {
  databaseDocs: {
    id: "database",
    outputDir: "docs/generated/database",
    postgresImage: "postgres:16",
    schemaSpyImage: "schemaspy/schemaspy:7.0.2",
    port: 55439,
    temporaryRoot: ".local",
    databases: [
      {
        id: "application",
        database: "application_docs",
        schema: "public",
        migrate: {
          command: ["npm", "run", "migrate"],
          env: { DATABASE_URL: "${DATABASE_URL}" }
        }
      }
    ]
  }
};
```

Migration command arguments and environment values may use:

- `${DATABASE_URL}`
- `${DATABASE_CONTAINER}`
- `${DATABASE_NAME}`
- `${DATABASE_HOST}`
- `${DATABASE_PORT}`
- `${DATABASE_USER}`
- `${DATABASE_PASSWORD}`

The generator creates a temporary PostgreSQL container, runs migrations, invokes SchemaSpy, retains only schema documentation and a schema-only dump, and removes the container. Do not configure migration commands that seed production or sensitive data.

## Recommended repository structure

```text
docs/
  reference/                 # Neutral description of implemented behavior
  review/                    # Findings, evidence analysis, release posture
  diagrams/                  # Mermaid source
  generated/                 # Reproducible output and retained evidence
    reference/
    review/
    api/
    database/
    coverage/
    inventory.json
reviewdocs.config.mjs
```

Keep these roles distinct:

- **Reference:** what the system currently does.
- **Review:** what is risky, deficient, accepted, fixed, or release-blocking.
- **Evidence:** schemas, contracts, test logs, coverage, and inventories produced by commands.
- **Generated sites:** navigable projections; never the canonical authoring format.

## Review workflow

The starter campaign protocol establishes a reusable review lifecycle:

1. Record the exact source and comparison baselines.
2. Generate fresh evidence in isolated locations.
3. Inspect executable behavior and implementation.
4. Give every previous finding an explicit lifecycle state.
5. Search for new regressions.
6. Regenerate and validate the reference and review sites.
7. Report failed tests and unavailable evidence honestly.

Stable finding IDs and explicit states—fixed, partially fixed, unchanged, superseded, accepted, or unable to verify—make incremental reassessments comparable over time.

## Application screenshots and coverage

UI screenshots and test coverage remain application-specific. Integrate their existing commands into CI and place sanitized outputs under `docs/generated/coverage` or an asset directory referenced by a collection. Do not copy test fixtures, selectors, live identifiers, credentials, or coverage claims between repositories.

## Security and publication

Generated evidence can accidentally contain credentials, private URLs, live identifiers, or row data. Before publishing:

- Generate database material from empty disposable databases.
- Retain schema-only dumps.
- Scan generated files for secrets and private keys.
- Clearly label partial and failed evidence.
- Never promote an incomplete run over a valid baseline silently.
- Inspect the npm package with `npm pack --dry-run`.

## Development

```sh
npm install --omit=optional
npm test
npm run build:example
npm run check:example
```

The complete validation is `npm run check`.

## License

Apache License 2.0. See [LICENSE](LICENSE).
