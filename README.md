# reviewdocs

`reviewdocs` builds a factual system reference, an engineering review, and a task-based user guide from maintained repository sources. It can also bundle user chapters as application help. Generated HTML is a projection of those sources. The tool does not invent explanations, findings or release judgments.

The toolkit is product, organization, language, and infrastructure neutral. Sites work offline and through a loopback browser URL. The [capability guide](docs/usage.md) covers safe adoption/upgrades, campaign ledgers, evidence adapters, screenshots, private provenance, diagnostics, migration and app-help projection. See the [tool comparison](docs/tool-comparison.md) for alternatives and boundaries.

See the [changelog](CHANGELOG.md) for release changes and migration guidance.

## Quick start

From the repository you want to document:

```sh
npm install --save-dev github:nieuwsma/reviewdocs#v0.5.0
npx reviewdocs init
npx reviewdocs build
```

Then author Markdown under the configured collection source directories, build again, and run `npx reviewdocs open`. The landing page links all three experiences. Starter text is an authoring outline, not completed product documentation; enable `strict: true` after replacing the outlines.

Before you treat the result as current, run:

```sh
npx reviewdocs check
```

`check` overwrites the selected outputs, builds collections and OpenAPI a second time, and fails if that second build differs. It also fails when a collection page points at a missing local file or heading. It does not compare the output with the last commit. Afterward, `git diff -- docs/generated` shows whether a committed site was stale.

`init` writes into the current directory, or into a directory you pass: `npx reviewdocs init path/to/project`. It refuses to replace a starter path that already exists unless you pass `--force`. `--force` overwrites those conflicting starter files. It does not delete the rest of the repository.

## Install

Until the package is on npm, install it from GitHub:

```sh
npm install --save-dev github:nieuwsma/reviewdocs#v0.5.0
```

For a private checkout over SSH:

```sh
npm install --save-dev git+ssh://git@github.com:nieuwsma/reviewdocs.git#v0.5.0
```

After publication, `npm install --save-dev reviewdocs` is enough. `init` does not edit `package.json`. Add the dependency yourself before relying on the copied CI workflow.

To work on this package locally, run `npm install` and `npm link` here, then `npx reviewdocs` in the other repository.

For an established repository use `npx reviewdocs adopt --dry-run`, then `npx reviewdocs adopt`. Existing documents and configuration remain consumer-owned. `upgrade` updates unchanged installed skills and writes three-way proposals for conflicts. Use a pinned local package for CI rather than `npm link`; the [repository-local recipe](docs/usage.md#install-and-adopt) supports applications without a root npm package.

### Requirements

- Node.js 20 or newer
- Docker, with the configured images already pulled, only when database documentation is configured
- `@mermaid-js/mermaid-cli` only when a diagram group is configured. It is an optional dependency of this package. If you installed with `--omit=optional`, install it in the consuming repository before building diagrams
- A migration command supplied by the consuming repository when database documentation is configured

## What init writes

```text
reviewdocs.config.mjs
docs/reference/                         # domain, architecture, state, data and worked example
docs/review/                            # findings, posture, and the review protocol
docs/user/                              # tasks, expected results and troubleshooting
.reviewdocs/                            # installed skill bases and integration recipes
docs/diagrams/                          # empty until you add .mmd files and config
.github/workflows/docs.yml              # runs check; requires the devDependency
.agents/skills/system-reference/        # factual manual authoring
.agents/skills/evidence-review/         # review tracks, lifecycle and evidence
.agents/skills/user-guide/              # real UI tasks, synthetic capture and app help
```

The complete config publishes `reference`, `review`, `user` and finite `help` projections, a landing page, a structured campaign, and an inventory. Diagrams, OpenAPI, database docs and product-specific test lanes are optional.

A Markdown file becomes a site page only when it is listed in that collection's `pages` array. The starter review pages are the review index, the executive summary, the design review, the code review, the findings register, and the campaign protocol.

## Commands

```sh
# Build every artifact in reviewdocs.config.mjs
npx reviewdocs build

# Build, then verify collections and OpenAPI
npx reviewdocs check

# Limit either command to artifact ids from the config
npx reviewdocs build --only reference,review

# Read a config file somewhere else
npx reviewdocs check --config config/documentation.mjs
```

Build order is diagrams, inventory, OpenAPI, database documentation, structured campaign, Markdown collections, then the landing page. Paths are relative to the config file. `--only` selects collection, campaign, portal or artifact IDs; evidence runs require explicit lane IDs. The default inventory and database IDs remain `inventory` and `database`.

`check` always builds the selected artifacts, then builds each selected collection and OpenAPI document again. Those two passes must match byte for byte, collection links and heading anchors must resolve, and the copied OpenAPI document must match its source. Diagram, inventory, and database outputs are rebuilt and are not compared across the two passes. A link from a collection page to one of those files is still checked. `check` does not compare any of this with git.

This package uses the same commands through Make:

```sh
make test
make example
make check
```

`example/` is a runnable three-category Note Desk demonstration with glossary/diagrams, finite help, a canonical campaign, and a separately executed synthetic workflow evidence lane. Its paths are `docs/system`, `docs/reviews` and `docs/user`. `npm run build:example` writes `example/docs/generated/`.

## Configuration

`init` writes this config:

```js
export default {
  collections: [
    {
      id: "reference",
      title: "Project System Reference",
      subtitle: "Current behavior and architecture",
      sourceDir: "docs/reference",
      outputDir: "docs/generated/reference",
      pages: [
        { file: "README.md", output: "index.html", label: "Start here" },
        { file: "architecture.md", label: "Architecture" }
      ],
      artifacts: [{ label: "Engineering review", href: "../review/index.html" }]
    },
    {
      id: "review",
      title: "Project Engineering Review",
      subtitle: "Evidence, findings, and release posture",
      sourceDir: "docs/review",
      outputDir: "docs/generated/review",
      pages: [
        { file: "README.md", output: "index.html", label: "Review index" },
        { file: "executive-summary.md", label: "Executive summary" },
        { file: "design-review.md", label: "Design review" },
        { file: "code-review.md", label: "Code review" },
        { file: "findings-register.md", label: "Findings register" },
        { file: "campaign-protocol.md", label: "Campaign protocol" }
      ],
      artifacts: [{ label: "System reference", href: "../reference/index.html" }]
    }
  ],
  inventory: { id: "inventory", root: ".", output: "docs/generated/inventory.json" }
};
```

Each collection requires `id`, `title`, `sourceDir`, `outputDir`, and at least one page.

- `pages[].file` is a Markdown path relative to `sourceDir`.
- `pages[].output` is the HTML file name. The default replaces `.md` with `.html`. Use `output: "index.html"` for the page that should open as the site index.
- `pages[].label` is the navigation text. The default is the file name.
- `artifacts` are extra sidebar links. Their `href` values are written as given.
- `assets` is a list of illustration files/directories, relative to `sourceDir`, copied into the output.
- `rewrites` maps an exact `href` string in the Markdown HTML to another URL.

A link to any configured collection's Markdown is rewritten to its HTML, including nested paths and cross-collection anchors. `rewrites` handles exceptional legacy URLs. Heading ids come from heading text. Portable profiles reject absolute machine-specific file URLs.

### Inventory

The inventory writes JSON and can render tables inside a Markdown collection with `{{inventory-report}}`. The report shows physical and nonblank lines per file type, separates tests from production/tooling, and groups production/tooling by surface. Comments count as nonblank lines, matching the EXAMPLE measurement. Collection builds automatically build this dependency and freshness verification checks it. It counts first-party source files and non-blank lines, and it marks test paths. Generated output and dependencies are excluded. The defaults skip `.git/`, `node_modules/`, `vendor/`, `dist/`, `build/`, `coverage/`, and `docs/generated/`. Set `exclude` to replace that list. Set `extensions` to replace the default source extensions.

### Diagrams

Add a group only when you have Mermaid sources:

```js
diagrams: [
  {
    id: "architecture-diagrams",
    sourceDir: "docs/diagrams",
    outputDir: "docs/generated/diagrams"
  }
]
```

Every `*.mmd` file in `sourceDir` becomes an SVG with the same basename. Link the SVG from a collection page with a relative path. Include the diagram id in `--only` when you also build a page that links to the SVG.

### OpenAPI

```js
openapi: [
  {
    id: "api",
    title: "Public API",
    source: "api/openapi.json",
    outputDir: "docs/generated/api"
  }
]
```

`source` may be OpenAPI JSON or YAML. The build embeds the contract in an offline Swagger UI page at `outputDir/index.html`; raw JSON is not published. Interactive requests are disabled. `npx reviewdocs check --only api` rebuilds that directory and fails if the copied document differs from `source`.

The generator reads `source` and does not write it. Request and response examples belong in that file. The next build replaces `outputDir`; the contract is embedded in the offline `index.html`, not published as a separate downloadable JSON file. The page names the source it was built from. Put durable warnings in `info.description` so they appear in the generated reference.

### Database documentation

Database documentation is optional. Each database is created empty and migrated by a command you supply. The PostgreSQL and SchemaSpy images must already be present locally; the generator does not pull them.

```js
databaseDocs: {
  id: "database",
  outputDir: "docs/generated/database",
  postgresImage: "postgres:16",
  schemaSpyImage: "schemaspy/schemaspy:7.0.2",
  port: 55439,
  temporaryRoot: ".local",
  inputs: ["db/migrations", "scripts/migrate.mjs"], // actual producer inputs
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
```

The migration command runs in the directory that contains the config file. Command arguments and environment values may use:

- `${DATABASE_URL}`
- `${DATABASE_CONTAINER}`
- `${DATABASE_NAME}`
- `${DATABASE_HOST}`
- `${DATABASE_PORT}`
- `${DATABASE_USER}`
- `${DATABASE_PASSWORD}`

The generator starts a temporary PostgreSQL container, runs the migration, runs SchemaSpy, keeps the schema documentation and a schema-only dump, and removes the container. Do not point the migration at production data or seed sensitive rows.

## What to commit

Commit `reviewdocs.config.mjs`, the configured Markdown sources and any diagram or OpenAPI source. Generated HTML can be published from its declared public file set; private provenance and raw evidence stay in `.reviewdocs/`. Because `check` overwrites that directory before comparing two builds, look at `git diff -- docs/generated` and commit the rebuilt files when the diff is a real source change.

You may gitignore `docs/generated/` instead. CI can rebuild it, and the Markdown remains the source. Do not commit `.local/`, dependency directories, or database output produced from real rows.

The workflow copied to `.github/workflows/docs.yml` runs `npm ci` and `npx reviewdocs check` on pull requests and pushes to `main`. `npm ci` installs `reviewdocs` only after it is in `package.json` and the lockfile.

This package gitignores `example/docs/generated/` because `npm run check` rebuilds that example.

## Review workflow

Keep the two documents apart:

- **Reference:** what the system currently does.
- **Review:** what is risky, deficient, accepted, fixed, or release-blocking.
- **Evidence:** schemas, contracts, test logs, coverage, and inventories produced by commands.
- **Generated sites:** navigable projections of the Markdown and evidence. Edit the sources, then rebuild.

The starter campaign protocol is the lifecycle:

1. Record the exact source and comparison baselines.
2. Generate fresh evidence in isolated output directories.
3. Inspect executable behavior and implementation.
4. Give every previous finding an explicit lifecycle state.
5. Search for new regressions.
6. Regenerate and validate the reference and review sites.
7. Report failed tests and unavailable evidence honestly.

A new finding starts as `open`. On reassessment, classify every existing finding as `fixed`, `partially fixed`, `unchanged`, `superseded`, `accepted`, or `unable to verify`. Keep the same finding id, and do not delete history silently.

The command list for a campaign is the consumer-owned `docs/review/evidence-matrix.md` plus configured evidence lanes. Adapt these for the repository before the first campaign; managed skill resources explain the method. The method for the code and design write-up is `.agents/skills/evidence-review/references/review-outline.md`. The agent skill in that directory tells an agent to trace the implementation and write those pages. It does not let `reviewdocs` invent a conclusion.

## Screenshots and coverage

UI screenshots and test coverage stay application-specific. Run the application's own commands in CI and retain sanitized outputs only in private `.reviewdocs/` evidence state. Do not copy fixtures, selectors, live identifiers, credentials, or coverage claims from another repository.

## Security and publication

Generated evidence can contain credentials, private URLs, live identifiers, or row data. Before publishing:

- Generate database material from empty disposable databases.
- Retain schema-only dumps.
- Scan generated files for secrets and private keys.
- Label partial and failed evidence as partial or failed.
- Do not replace a valid baseline with an incomplete run without saying so.
- Inspect a package tarball with `npm pack --dry-run` before publishing this package.

## Development

Repository planning: [tool comparison](docs/tool-comparison.md) and
[reliability and agent refinement plan](docs/planning/reliability-and-agent-refinement-plan.md).

```sh
npm install --omit=optional
npm test
npm run build:example
npm run check:example
```

The full local check is `npm run check`. It tests the package, builds the example, and runs `check` on the example. Use Node.js 20 or newer. Keep the core free of product and organization assumptions. Tests must use synthetic data and disposable resources.

## License

Apache License 2.0. See [LICENSE](LICENSE).
