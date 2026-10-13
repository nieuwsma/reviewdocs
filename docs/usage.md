# Documentation capability

reviewdocs 0.5 provides three authoring profiles: a factual system reference, an
engineering review, and a task-based user guide. The complete scaffold also
produces finite application help from the same user sources. The packaged skills
guide source research and writing; the tools do not invent explanations, findings
or release judgments.

## Install and adopt

Install a pinned 0.5.x version/revision in the consuming repository. For a non-Node
application, use a dedicated `tools/reviewdocs/package.json` and lockfile:

```sh
mkdir -p tools/reviewdocs
cd tools/reviewdocs
npm init -y
npm install --save-dev github:nieuwsma/reviewdocs#v0.5.0
cd ../..
node tools/reviewdocs/node_modules/reviewdocs/bin/reviewdocs.mjs adopt --dry-run
node tools/reviewdocs/node_modules/reviewdocs/bin/reviewdocs.mjs adopt
```

Use the release tarball or pinned GitHub tag until this package is published
to npm. CI must be able to retrieve
that immutable dependency; an absolute sibling path or `npm link` is unsuitable.

`adopt` adds missing templates and skills. Existing config, Markdown, findings and
AGENTS.md remain consumer-owned. A proposed config and locally edited skills are
reported as conflicts, with base/local/incoming JSON in `.reviewdocs/proposals/`.
Merge those changes deliberately. CI is copied as a recipe, not activated in an
established repository. `.reviewdocs/AGENTS.fragment.md` supplies optional routing.

`upgrade` uses the same adoption procedure: only unchanged managed skills and CI
recipes update automatically. `.reviewdocs/install.json` records their installed
version, content and hashes. Documentation sources are never auto-upgraded. A
fresh `init` records installed skill bases as well. `--no-skills` excludes skills
from adoption. The supported scaffold profile is `complete`; customize or omit
topics in configuration for your product. `--force` applies only to `init`.

The three shipped skills are `system-reference`, `evidence-review` and `user-guide`.
Repository-specific evidence commands and rules belong outside managed skill
files so upgrades can preserve the reusable procedures.

## Commands and proof boundaries

| Command | Behavior |
| --- | --- |
| `build` | Render selected artifacts and record input/output provenance; never run configured test lanes |
| `check` | Build, compare repeated collection/API/campaign output, validate links/anchors, campaign state, screenshots and required retained evidence |
| `doctor [--only ids] [--json]` | Read-only artifact, prerequisite and freshness diagnostics; no producer execution or service startup |
| `migrate [--dry-run]` | Verify and relocate compatible legacy provenance/evidence into private state; preserve recorded version |
| `verify` | Read-only comparison of source fingerprints and output hashes; no regeneration or test execution |
| `evidence --only lane` | Execute the selected repository commands; retain every result, promote only complete passing evidence |
| `serve` | Serve the generated landing directory on loopback; print the exact URL |
| `open` | Serve and ask the OS to open that URL; server remains active until stopped |
| `export directory` | Verify artifacts, validate portable links, copy a relocatable portal into a new directory |

`--only` validates IDs rather than silently accepting unknown selections. A
provenance-required profile checks nonselected artifacts too: rebuilding Markdown
does not make an old schema current. `verify` checks selected evidence lanes, or
lanes with `required: true` when no selection is supplied. Gates describe their
actual proof; they never infer production readiness.

## Collections, links and audience

Collections retain the existing `id`, `sourceDir`, `outputDir`, `pages`, `assets`
and `artifacts` configuration. Add these options as needed:

```js
{
  id: "user", title: "User guide",
  sourceDir: "docs/user", outputDir: "docs/generated/user",
  guide: true, screenshots: true, strict: true,
  glossary: "docs/reference/glossary.json",
  pages: [
    { file: "README.md", output: "index.html", label: "Choose a task", group: "Guide" },
    { file: "tasks/save.md", label: "Save a result", group: "Tasks" },
    { file: "glossary.md", label: "Glossary", glossary: true }
  ],
  assets: ["assets"],
  topics: [{ id: "save", page: "tasks/save.md" }, { id: "hardware", omitted: "No hardware workflow" }]
}
```

`strict` rejects unfinished starter markers. Topic maps reject missing publication
or omission reasons. Groups, page filtering, page contents, keyboard focus,
previous/next guide links, full-size images and print layouts are shared by the
renderer. Cross-collection Markdown links resolve automatically to published
HTML, including nested output paths and anchor checks. When a source appears in
multiple projections, each projection's own pages take precedence.

Enable `portable: true` to reject machine-specific `file:` URLs. A landing
directory containing the generated artifacts supports offline export and one
browser entry point. Checkout-only code links cannot survive that export: copy
the desired source artifacts into declared assets or link an explicitly external
source browser. Do not use absolute local-machine URLs to hide broken links.

The glossary JSON maps keys to `{label, definition}`. Use `{{revision}}` or
`{{revision|saved revision}}`; unknown keys fail. A `glossary: true` page emits
definitions and anchors from that same JSON. Terms expose both a keyboard-focus
tooltip and a link to the definition.

Explicit audience blocks preserve instructions during help projection:

```text
:::audience contributor
Implementation/capture guidance for documentation maintainers.
:::
```

A `bundled: true, audience: "user"` collection publishes only configured guide,
glossary and asset paths. Out-of-bundle links fail rather than silently deleting
procedural paragraphs. Explicit external destinations can be listed in
`allowedExternal`. App embedding, a Help control, release-build wiring and 404
behavior are the consumer application's responsibility.

## Campaign ledger

Configure `campaign: { id, source, previous?, outputDir }`. The source uses the
packaged [campaign schema](../schemas/campaign.schema.json). It records tracks,
evidence, stable canonical findings and dated dispositions. Fields include:

- Evidence: `id`, `status`, `proof`, `description`, retained `path` for executed/read proof.
- Finding: `id`, `title`, `track`, `exitCondition`, optional source `aliases`, `history`.
- Disposition: `date`, `status`, `severity`, `confidence`, `reason`, evidence IDs.

With a previous ledger, every canonical ID and source alias must remain, prior
history/evidence cannot be rewritten, and each prior finding needs a fresh
explicit disposition. New proof uses a new evidence ID. A fixed state needs
passing evidence with its real scope. Narrative track analysis remains authored;
use `{{review-summary}}`, `{{review-findings}}` and `{{review-history}}` to render
counts and lifecycle state once. A historical campaign may intentionally describe
an older commit; document that boundary instead of certifying new product code.

## Evidence adapters

```js
evidence: [{
  id: "integration", cwd: ".", proof: "integration", required: true,
  inputs: ["src", "tests", "db/migrations"],
  command: ["node", "scripts/test.mjs", "--output", "${RUN_DIR}"],
  outputDir: "docs/generated/evidence/integration",
  outputs: ["result.json", "coverage.json"],
  resultFile: "result.json", requireNoSkips: true, timeoutMs: 300000
}]
```

Argument arrays run without a shell. `REVIEWDOCS_RUN_DIR` is also available to
the command. The adapter owns isolated-resource allocation and cleanup. Required
file prerequisites can be configured with `requires`. A result file reports
nonnegative integer `tests`, `passed`, `failed` and `skipped` counts; no-skip lanes
must provide explicit skip counts. Missing outputs, skips or changed inputs
produce partial evidence. Nonzero exit/timeout is failed, missing prerequisites
unavailable. `latest.json` advances only for complete passing proof. Retained
output hashes detect later tampering.

Logs and the recorded producer redact common tokens, private keys and credential
URLs. Arbitrary result/coverage artifacts remain adapter-owned: sanitize them
before retaining/publishing. Automated redaction is not a substitute for reviewing
evidence content. Do not put secrets in command arguments.

## Freshness and screenshots

Every built artifact has private provenance under `.reviewdocs/provenance/`, recording toolkit version, Git metadata and stable input/output hashes. Evidence and relocated inventories live under `.reviewdocs/`; the output tree contains declared public artifacts and a minimal file ownership manifest. `doctor --json` emits schemaVersion 1 diagnostics and does not render or run producers. Loading the trusted `.mjs` configuration still executes its top-level code. `migrate --dry-run` previews verified legacy state relocation; migration preserves the proof’s original version, so it may remain stale and need an explicit rebuild. Declare producer input roots for database docs and evidence. A source
change during production prevents current provenance/promotion. Excluded output
roots and dependency/build directories do not contaminate fingerprints.

Inventory prunes nested dependency/build mirrors, reports scope and per-language
totals, and accepts first-party `include` roots. Configure `exclude` explicitly;
`includeGenerated: true` disables the nested generated-directory filter when a
directory name such as `build` intentionally contains authored source.

Screenshot groups configure `id`, `manifest`, `assets`, and production `inputs`.
The [manifest schema](../schemas/screenshots.schema.json) requires source hash,
capture mode, viewport, filename, chapter, alt text and image hash. Import
`inputDigest`, `hash` and `sourceState` from `reviewdocs/provenance` in the
product-owned capture harness. Checks reject stale inputs, changed/unexplained
images and unreferenced captures. Source screenshot directories are copied as
assets, and guide images open at full size. Capture is explicit and separate from
HTML builds; visual inspection and real-stack walkthroughs remain essential.

## Toolkit verification

`npm run check` runs unit/integration checks plus the complete neutral example.
`npm run check:browser` additionally needs installed Chromium (`npx playwright
install chromium`) and permission to launch/bind loopback. It checks navigation,
keyboard glossary access, narrow/print layouts, help 404s and the actual synthetic
demo workflow. `npm run capture:example` runs that check and writes a real-UI
screenshot gallery/manifest; captures are not produced by ordinary builds.

The example's Node evidence lane tests its actual state functions with synthetic
data. It does not certify browser rendering, accounts, model inference or a
deployment. Database/diagram adapters need Docker/Mermaid respectively and remain
optional. The implementation session could not launch Chromium or bind a local
server under its macOS sandbox; browser acceptance is not claimed there.


## Reuse the application's visual system

A consumer may provide `presentation: {module, assets, inputs, options}`. Paths are relative to its repository. `module` exports `renderPage(page)` and `assets` contains local `theme.css` and `theme.js`. Collections, the landing page and the campaign use this provider. OpenAPI and SchemaSpy retain their specialist viewers. Compile the provider before building documentation; its compiled module, assets and declared producer inputs are fingerprinted. `_presentation` is reserved for these assets and travels with each collection, including finite application help.

For Foundation, import `createFoundationDocs` and `createFoundationRenderer` from `reviewdocs/foundation`. Supply the adopter's installed React, React DOM server renderer, and actual Foundation AppShell, PageLayout, TextField, Button, Breadcrumbs and DataTable. Compile a server entry exporting `renderPage` and a browser entry mounting the same Docs component. Include the installed Foundation CSS in the browser bundle. Use one React instance across dependencies. This keeps Foundation as an adopter-owned dependency and preserves its responsive navigation and preference controls. Restrict extra CSS to documentation prose, diagrams and print composition using Foundation tokens.

The renderer emits readable static HTML, safe page JSON and local browser assets. The browser mounts the same components so Foundation can choose navigation for its current breakpoint. A `reviewdocs:rendered` event reconnects print and diagram enhancement after mounting. Compile immutable local bundles; do not require a sibling checkout at runtime or fetch UI assets from a CDN.

For a Foundation logo, set presentation options `brandImage: "brand.png"` and place that file in the compiled presentation asset directory. The adapter renders it through Foundation’s brand mark and uses it as the browser icon. Relative asset paths follow nested chapters and finite help bundles. Use the adopter’s supplied image; no image transformation is required.


## Visible code counts

Add `{{inventory-report}}` to a published Markdown page with `inventory` configured. The producer writes per-file records, physical/nonblank totals by extension, tests versus production/tooling, and production/tooling by surface. Configure `include`, `exclude`, and `extensions` to describe actual first-party source. Optional `surfaces: [{id, label, include}]` groups paths under product responsibilities. Default surfaces follow the first path component. Comments count as nonblank; a final newline does not add a line. The macro establishes a build dependency, including with `--only`, and verification rejects stale producer inputs or a report based on an older inventory.

## Publication boundary

Source and evidence paths are private inputs, cited as plain filenames. Collection asset directories accept illustrations only and reject code, configuration, raw evidence and archives, including unlinked files and symlinks. Local hyperlinks must resolve to generated HTML documentation; screenshots are inline illustrations. Publish operator runbooks as collection pages rather than file downloads. OpenAPI links resolve to the API documentation page. Campaign and raw evidence stay in private project state; the published review states its status and proof boundary without copying evidence files. `check` also rejects source files in retained output.
